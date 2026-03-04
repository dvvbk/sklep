package handlers

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	v1 "github.com/sklep/golden-fish/gen/golden_fish/v1"
	"github.com/sklep/golden-fish/internal/middleware"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type OrderHandler struct {
	db *pgxpool.Pool
}

func NewOrderHandler(db *pgxpool.Pool) *OrderHandler {
	return &OrderHandler{db: db}
}

func (h *OrderHandler) CreateOrder(ctx context.Context, req *connect.Request[v1.CreateOrderRequest]) (*connect.Response[v1.CreateOrderResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	var cartID string
	err = h.db.QueryRow(ctx, "SELECT id FROM carts WHERE user_id=$1", claims.UserID).Scan(&cartID)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("cart not found"))
	}

	rows, err := h.db.Query(ctx, `
		SELECT product_id, product_name, price, quantity
		FROM cart_items WHERE cart_id=$1`, cartID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var items []*v1.OrderItem
	var total float64

	for rows.Next() {
		var item v1.OrderItem
		if err := rows.Scan(&item.ProductId, &item.ProductName, &item.Price, &item.Quantity); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		item.Subtotal = item.Price * float64(item.Quantity)
		total += item.Subtotal
		items = append(items, &item)
	}

	if len(items) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("cart is empty"))
	}

	tx, err := h.db.Begin(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer tx.Rollback(ctx)

	orderID := uuid.New().String()
	now := time.Now()
	msg := req.Msg

	_, err = tx.Exec(ctx, `
		INSERT INTO orders (id, user_id, total, status, shipping_address, shipping_city, shipping_postal_code, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
		orderID, claims.UserID, total, "pending",
		msg.ShippingAddress, msg.ShippingCity, msg.ShippingPostalCode, msg.Notes, now)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	for _, item := range items {
		_, err = tx.Exec(ctx, `
			INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			uuid.New().String(), orderID, item.ProductId, item.ProductName, item.Price, item.Quantity, item.Subtotal)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		_, err = tx.Exec(ctx, "UPDATE products SET stock = stock - $1 WHERE id = $2", item.Quantity, item.ProductId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	_, err = tx.Exec(ctx, "DELETE FROM cart_items WHERE cart_id=$1", cartID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	order := &v1.Order{
		Id:                 orderID,
		UserId:             claims.UserID,
		Items:              items,
		Total:              total,
		Status:             v1.OrderStatus_ORDER_STATUS_PENDING,
		ShippingAddress:    msg.ShippingAddress,
		ShippingCity:       msg.ShippingCity,
		ShippingPostalCode: msg.ShippingPostalCode,
		Notes:              msg.Notes,
		CreatedAt:          timestamppb.New(now),
		UpdatedAt:          timestamppb.New(now),
	}

	return connect.NewResponse(&v1.CreateOrderResponse{Order: order}), nil
}

func (h *OrderHandler) GetOrder(ctx context.Context, req *connect.Request[v1.GetOrderRequest]) (*connect.Response[v1.GetOrderResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	order, err := h.getOrder(ctx, req.Msg.OrderId, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	return connect.NewResponse(&v1.GetOrderResponse{Order: order}), nil
}

func (h *OrderHandler) ListOrders(ctx context.Context, req *connect.Request[v1.ListOrdersRequest]) (*connect.Response[v1.ListOrdersResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	pageSize := int32(10)
	if req.Msg.PageSize > 0 {
		pageSize = req.Msg.PageSize
	}
	page := int32(1)
	if req.Msg.Page > 0 {
		page = req.Msg.Page
	}
	offset := (page - 1) * pageSize

	var total int32
	h.db.QueryRow(ctx, "SELECT COUNT(*) FROM orders WHERE user_id=$1", claims.UserID).Scan(&total)

	rows, err := h.db.Query(ctx, `
		SELECT id, total, status, shipping_address, shipping_city, shipping_postal_code, notes, created_at, updated_at
		FROM orders WHERE user_id=$1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`, claims.UserID, pageSize, offset)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var orders []*v1.Order
	for rows.Next() {
		var o v1.Order
		var status string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&o.Id, &o.Total, &status, &o.ShippingAddress, &o.ShippingCity, &o.ShippingPostalCode, &o.Notes, &createdAt, &updatedAt); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		o.UserId = claims.UserID
		o.Status = statusFromString(status)
		o.CreatedAt = timestamppb.New(createdAt)
		o.UpdatedAt = timestamppb.New(updatedAt)
		o.Items, _ = h.getOrderItems(ctx, o.Id)
		orders = append(orders, &o)
	}

	return connect.NewResponse(&v1.ListOrdersResponse{Orders: orders, Total: total}), nil
}

func (h *OrderHandler) UpdateOrderStatus(ctx context.Context, req *connect.Request[v1.UpdateOrderStatusRequest]) (*connect.Response[v1.UpdateOrderStatusResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	statusStr := statusToString(req.Msg.Status)
	_, err = h.db.Exec(ctx, `
		UPDATE orders SET status=$1, updated_at=NOW()
		WHERE id=$2 AND user_id=$3`, statusStr, req.Msg.OrderId, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	order, err := h.getOrder(ctx, req.Msg.OrderId, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.UpdateOrderStatusResponse{Order: order}), nil
}

func (h *OrderHandler) getOrder(ctx context.Context, orderID, userID string) (*v1.Order, error) {
	var o v1.Order
	var status string
	var createdAt, updatedAt time.Time

	err := h.db.QueryRow(ctx, `
		SELECT id, user_id, total, status, shipping_address, shipping_city, shipping_postal_code, notes, created_at, updated_at
		FROM orders WHERE id=$1 AND user_id=$2`, orderID, userID).
		Scan(&o.Id, &o.UserId, &o.Total, &status, &o.ShippingAddress, &o.ShippingCity, &o.ShippingPostalCode, &o.Notes, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	o.Status = statusFromString(status)
	o.CreatedAt = timestamppb.New(createdAt)
	o.UpdatedAt = timestamppb.New(updatedAt)
	o.Items, _ = h.getOrderItems(ctx, o.Id)

	return &o, nil
}

func (h *OrderHandler) getOrderItems(ctx context.Context, orderID string) ([]*v1.OrderItem, error) {
	rows, err := h.db.Query(ctx, `
		SELECT product_id, product_name, price, quantity, subtotal
		FROM order_items WHERE order_id=$1`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*v1.OrderItem
	for rows.Next() {
		var item v1.OrderItem
		rows.Scan(&item.ProductId, &item.ProductName, &item.Price, &item.Quantity, &item.Subtotal)
		items = append(items, &item)
	}
	return items, nil
}

func statusFromString(s string) v1.OrderStatus {
	switch s {
	case "pending":
		return v1.OrderStatus_ORDER_STATUS_PENDING
	case "confirmed":
		return v1.OrderStatus_ORDER_STATUS_CONFIRMED
	case "shipped":
		return v1.OrderStatus_ORDER_STATUS_SHIPPED
	case "delivered":
		return v1.OrderStatus_ORDER_STATUS_DELIVERED
	case "cancelled":
		return v1.OrderStatus_ORDER_STATUS_CANCELLED
	default:
		return v1.OrderStatus_ORDER_STATUS_UNSPECIFIED
	}
}

func statusToString(s v1.OrderStatus) string {
	switch s {
	case v1.OrderStatus_ORDER_STATUS_PENDING:
		return "pending"
	case v1.OrderStatus_ORDER_STATUS_CONFIRMED:
		return "confirmed"
	case v1.OrderStatus_ORDER_STATUS_SHIPPED:
		return "shipped"
	case v1.OrderStatus_ORDER_STATUS_DELIVERED:
		return "delivered"
	case v1.OrderStatus_ORDER_STATUS_CANCELLED:
		return "cancelled"
	default:
		return "pending"
	}
}

// Ensure pgx is used
var _ = pgx.ErrNoRows

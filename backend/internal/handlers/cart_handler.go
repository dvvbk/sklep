package handlers

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	v1 "github.com/sklep/golden-fish/gen/golden_fish/v1"
	"github.com/sklep/golden-fish/internal/middleware"
)

type CartHandler struct {
	db *pgxpool.Pool
}

func NewCartHandler(db *pgxpool.Pool) *CartHandler {
	return &CartHandler{db: db}
}

func (h *CartHandler) GetCart(ctx context.Context, req *connect.Request[v1.GetCartRequest]) (*connect.Response[v1.GetCartResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	cart, err := h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.GetCartResponse{Cart: cart}), nil
}

func (h *CartHandler) AddItem(ctx context.Context, req *connect.Request[v1.AddItemRequest]) (*connect.Response[v1.CartResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	cart, err := h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var productName, imageURL string
	var price float64
	var stock int32
	err = h.db.QueryRow(ctx, `
		SELECT name, price, COALESCE(image_urls[1], ''), stock
		FROM products WHERE id = $1`, req.Msg.ProductId).
		Scan(&productName, &price, &imageURL, &stock)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("product not found"))
	}

	if stock < req.Msg.Quantity {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("insufficient stock"))
	}

	_, err = h.db.Exec(ctx, `
		INSERT INTO cart_items (id, cart_id, product_id, product_name, price, quantity, image_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (cart_id, product_id) DO UPDATE
		SET quantity = cart_items.quantity + $6`,
		uuid.New().String(), cart.Id, req.Msg.ProductId, productName, price, req.Msg.Quantity, imageURL)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	cart, err = h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.CartResponse{Cart: cart}), nil
}

func (h *CartHandler) RemoveItem(ctx context.Context, req *connect.Request[v1.RemoveItemRequest]) (*connect.Response[v1.CartResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	cart, err := h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	h.db.Exec(ctx, "DELETE FROM cart_items WHERE cart_id=$1 AND product_id=$2", cart.Id, req.Msg.ProductId)

	cart, err = h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.CartResponse{Cart: cart}), nil
}

func (h *CartHandler) UpdateItem(ctx context.Context, req *connect.Request[v1.UpdateItemRequest]) (*connect.Response[v1.CartResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	cart, err := h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if req.Msg.Quantity <= 0 {
		h.db.Exec(ctx, "DELETE FROM cart_items WHERE cart_id=$1 AND product_id=$2", cart.Id, req.Msg.ProductId)
	} else {
		h.db.Exec(ctx, "UPDATE cart_items SET quantity=$1 WHERE cart_id=$2 AND product_id=$3",
			req.Msg.Quantity, cart.Id, req.Msg.ProductId)
	}

	cart, err = h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.CartResponse{Cart: cart}), nil
}

func (h *CartHandler) ClearCart(ctx context.Context, req *connect.Request[v1.ClearCartRequest]) (*connect.Response[v1.CartResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	cart, err := h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	h.db.Exec(ctx, "DELETE FROM cart_items WHERE cart_id=$1", cart.Id)

	cart, err = h.getOrCreateCart(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.CartResponse{Cart: cart}), nil
}

func (h *CartHandler) getOrCreateCart(ctx context.Context, userID string) (*v1.Cart, error) {
	var cartID string
	err := h.db.QueryRow(ctx, "SELECT id FROM carts WHERE user_id=$1", userID).Scan(&cartID)
	if err != nil {
		cartID = uuid.New().String()
		_, err = h.db.Exec(ctx, "INSERT INTO carts (id, user_id) VALUES ($1, $2)", cartID, userID)
		if err != nil {
			return nil, err
		}
	}

	rows, err := h.db.Query(ctx, `
		SELECT product_id, product_name, price, quantity, image_url
		FROM cart_items WHERE cart_id=$1`, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*v1.CartItem
	var total float64
	var itemCount int32

	for rows.Next() {
		var item v1.CartItem
		if err := rows.Scan(&item.ProductId, &item.ProductName, &item.Price, &item.Quantity, &item.ImageUrl); err != nil {
			return nil, err
		}
		item.Subtotal = item.Price * float64(item.Quantity)
		total += item.Subtotal
		itemCount += item.Quantity
		items = append(items, &item)
	}

	return &v1.Cart{
		Id:        cartID,
		UserId:    userID,
		Items:     items,
		Total:     total,
		ItemCount: itemCount,
	}, nil
}

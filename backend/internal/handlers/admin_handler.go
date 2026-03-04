package handlers

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	v1 "github.com/sklep/golden-fish/gen/golden_fish/v1"
	"github.com/sklep/golden-fish/internal/middleware"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type AdminHandler struct {
	db *pgxpool.Pool
}

func NewAdminHandler(db *pgxpool.Pool) *AdminHandler {
	return &AdminHandler{db: db}
}

func (h *AdminHandler) CreateProduct(ctx context.Context, req *connect.Request[v1.AdminCreateProductRequest]) (*connect.Response[v1.AdminCreateProductResponse], error) {
	if _, err := middleware.ValidateAdminToken(req.Msg.Token); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, err)
	}

	msg := req.Msg
	id := uuid.New().String()
	now := time.Now()

	_, err := h.db.Exec(ctx, `
		INSERT INTO products (id, name, description, price, category_id, stock, image_urls, brand, weight_kg, featured, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		id, msg.Name, msg.Description, msg.Price, msg.CategoryId,
		msg.Stock, msg.ImageUrls, msg.Brand, msg.WeightKg, msg.Featured, now)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	product, err := h.getProductByID(ctx, id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.AdminCreateProductResponse{Product: product}), nil
}

func (h *AdminHandler) UpdateProduct(ctx context.Context, req *connect.Request[v1.AdminUpdateProductRequest]) (*connect.Response[v1.AdminUpdateProductResponse], error) {
	if _, err := middleware.ValidateAdminToken(req.Msg.Token); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, err)
	}

	msg := req.Msg
	_, err := h.db.Exec(ctx, `
		UPDATE products SET name=$1, description=$2, price=$3, category_id=$4, stock=$5,
		                    image_urls=$6, brand=$7, weight_kg=$8, featured=$9
		WHERE id=$10`,
		msg.Name, msg.Description, msg.Price, msg.CategoryId,
		msg.Stock, msg.ImageUrls, msg.Brand, msg.WeightKg, msg.Featured, msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	product, err := h.getProductByID(ctx, msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("product not found"))
	}

	return connect.NewResponse(&v1.AdminUpdateProductResponse{Product: product}), nil
}

func (h *AdminHandler) DeleteProduct(ctx context.Context, req *connect.Request[v1.AdminDeleteProductRequest]) (*connect.Response[v1.AdminDeleteProductResponse], error) {
	if _, err := middleware.ValidateAdminToken(req.Msg.Token); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, err)
	}

	_, err := h.db.Exec(ctx, "DELETE FROM products WHERE id=$1", req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.AdminDeleteProductResponse{Success: true}), nil
}

func (h *AdminHandler) CreateCategory(ctx context.Context, req *connect.Request[v1.AdminCreateCategoryRequest]) (*connect.Response[v1.AdminCreateCategoryResponse], error) {
	if _, err := middleware.ValidateAdminToken(req.Msg.Token); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, err)
	}

	msg := req.Msg
	id := uuid.New().String()

	_, err := h.db.Exec(ctx, `
		INSERT INTO categories (id, name, description, slug, icon)
		VALUES ($1, $2, $3, $4, $5)`,
		id, msg.Name, msg.Description, msg.Slug, msg.Icon)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var cat v1.Category
	err = h.db.QueryRow(ctx, `
		SELECT id, name, description, slug, icon,
		       (SELECT COUNT(*) FROM products WHERE category_id = $1) as product_count
		FROM categories WHERE id = $1`, id).
		Scan(&cat.Id, &cat.Name, &cat.Description, &cat.Slug, &cat.Icon, &cat.ProductCount)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.AdminCreateCategoryResponse{Category: &cat}), nil
}

func (h *AdminHandler) UpdateCategory(ctx context.Context, req *connect.Request[v1.AdminUpdateCategoryRequest]) (*connect.Response[v1.AdminUpdateCategoryResponse], error) {
	if _, err := middleware.ValidateAdminToken(req.Msg.Token); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, err)
	}

	msg := req.Msg
	_, err := h.db.Exec(ctx, `
		UPDATE categories SET name=$1, description=$2, slug=$3, icon=$4 WHERE id=$5`,
		msg.Name, msg.Description, msg.Slug, msg.Icon, msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var cat v1.Category
	err = h.db.QueryRow(ctx, `
		SELECT id, name, description, slug, icon,
		       (SELECT COUNT(*) FROM products WHERE category_id = $1) as product_count
		FROM categories WHERE id = $1`, msg.Id).
		Scan(&cat.Id, &cat.Name, &cat.Description, &cat.Slug, &cat.Icon, &cat.ProductCount)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("category not found"))
	}

	return connect.NewResponse(&v1.AdminUpdateCategoryResponse{Category: &cat}), nil
}

func (h *AdminHandler) DeleteCategory(ctx context.Context, req *connect.Request[v1.AdminDeleteCategoryRequest]) (*connect.Response[v1.AdminDeleteCategoryResponse], error) {
	if _, err := middleware.ValidateAdminToken(req.Msg.Token); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, err)
	}

	_, err := h.db.Exec(ctx, "DELETE FROM categories WHERE id=$1", req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.AdminDeleteCategoryResponse{Success: true}), nil
}

func (h *AdminHandler) ListAllOrders(ctx context.Context, req *connect.Request[v1.AdminListAllOrdersRequest]) (*connect.Response[v1.AdminListAllOrdersResponse], error) {
	if _, err := middleware.ValidateAdminToken(req.Msg.Token); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, err)
	}

	msg := req.Msg
	pageSize := int32(20)
	if msg.PageSize > 0 {
		pageSize = msg.PageSize
	}
	page := int32(1)
	if msg.Page > 0 {
		page = msg.Page
	}
	offset := (page - 1) * pageSize

	var total int32
	h.db.QueryRow(ctx, "SELECT COUNT(*) FROM orders").Scan(&total)

	rows, err := h.db.Query(ctx, `
		SELECT id, user_id, total, status, shipping_address, shipping_city, shipping_postal_code, notes, created_at, updated_at
		FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2`, pageSize, offset)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var orders []*v1.Order
	for rows.Next() {
		var o v1.Order
		var statusStr string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&o.Id, &o.UserId, &o.Total, &statusStr,
			&o.ShippingAddress, &o.ShippingCity, &o.ShippingPostalCode,
			&o.Notes, &createdAt, &updatedAt); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		o.Status = statusFromString(statusStr)
		o.CreatedAt = timestamppb.New(createdAt)
		o.UpdatedAt = timestamppb.New(updatedAt)

		itemRows, err := h.db.Query(ctx, `
			SELECT product_id, product_name, price, quantity, subtotal
			FROM order_items WHERE order_id=$1`, o.Id)
		if err == nil {
			for itemRows.Next() {
				var item v1.OrderItem
				itemRows.Scan(&item.ProductId, &item.ProductName, &item.Price, &item.Quantity, &item.Subtotal)
				o.Items = append(o.Items, &item)
			}
			itemRows.Close()
		}
		orders = append(orders, &o)
	}

	return connect.NewResponse(&v1.AdminListAllOrdersResponse{Orders: orders, Total: total}), nil
}

func (h *AdminHandler) ListUsers(ctx context.Context, req *connect.Request[v1.AdminListUsersRequest]) (*connect.Response[v1.AdminListUsersResponse], error) {
	if _, err := middleware.ValidateAdminToken(req.Msg.Token); err != nil {
		return nil, connect.NewError(connect.CodePermissionDenied, err)
	}

	msg := req.Msg
	pageSize := int32(20)
	if msg.PageSize > 0 {
		pageSize = msg.PageSize
	}
	page := int32(1)
	if msg.Page > 0 {
		page = msg.Page
	}
	offset := (page - 1) * pageSize

	var total int32
	h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&total)

	rows, err := h.db.Query(ctx, `
		SELECT id, email, first_name, last_name,
		       COALESCE(phone,''), COALESCE(address,''), COALESCE(city,''), COALESCE(postal_code,''),
		       is_admin, created_at
		FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`, pageSize, offset)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var users []*v1.User
	for rows.Next() {
		var u v1.User
		var createdAt time.Time
		if err := rows.Scan(&u.Id, &u.Email, &u.FirstName, &u.LastName,
			&u.Phone, &u.Address, &u.City, &u.PostalCode,
			&u.IsAdmin, &createdAt); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		u.CreatedAt = timestamppb.New(createdAt)
		users = append(users, &u)
	}

	return connect.NewResponse(&v1.AdminListUsersResponse{Users: users, Total: total}), nil
}

func (h *AdminHandler) getProductByID(ctx context.Context, id string) (*v1.Product, error) {
	row := h.db.QueryRow(ctx, `
		SELECT p.id, p.name, p.description, p.price, p.category_id, c.name,
		       p.stock, p.image_urls, p.brand, p.weight_kg, p.attributes,
		       p.featured, p.rating, p.review_count, p.created_at
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.id = $1`, id)
	return scanProduct(row)
}


package handlers

import (
	"context"
	"fmt"
	"math"
	"time"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5/pgxpool"
	v1 "github.com/sklep/golden-fish/gen/golden_fish/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type ProductHandler struct {
	db *pgxpool.Pool
}

func NewProductHandler(db *pgxpool.Pool) *ProductHandler {
	return &ProductHandler{db: db}
}

func (h *ProductHandler) GetProduct(ctx context.Context, req *connect.Request[v1.GetProductRequest]) (*connect.Response[v1.GetProductResponse], error) {
	row := h.db.QueryRow(ctx, `
		SELECT p.id, p.name, p.description, p.price, p.category_id, c.name,
		       p.stock, p.image_urls, p.brand, p.weight_kg, p.attributes,
		       p.featured, p.rating, p.review_count, p.created_at
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.id = $1`, req.Msg.Id)

	product, err := scanProduct(row)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	return connect.NewResponse(&v1.GetProductResponse{Product: product}), nil
}

func (h *ProductHandler) ListProducts(ctx context.Context, req *connect.Request[v1.ListProductsRequest]) (*connect.Response[v1.ListProductsResponse], error) {
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

	sortBy := "created_at"
	sortOrder := "DESC"
	if msg.SortBy != "" {
		sortBy = msg.SortBy
	}
	if msg.SortOrder != "" {
		sortOrder = msg.SortOrder
	}

	args := []interface{}{}
	where := "WHERE 1=1"
	argIdx := 1

	if msg.MinPrice > 0 {
		where += fmt.Sprintf(" AND p.price >= $%d", argIdx)
		args = append(args, msg.MinPrice)
		argIdx++
	}
	if msg.MaxPrice > 0 {
		where += fmt.Sprintf(" AND p.price <= $%d", argIdx)
		args = append(args, msg.MaxPrice)
		argIdx++
	}
	if msg.CategoryId != "" {
		where += fmt.Sprintf(" AND p.category_id = $%d", argIdx)
		args = append(args, msg.CategoryId)
		argIdx++
	}

	countQuery := "SELECT COUNT(*) FROM products p JOIN categories c ON c.id = p.category_id " + where
	var total int32
	if err := h.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	args = append(args, pageSize, offset)
	query := fmt.Sprintf(`
		SELECT p.id, p.name, p.description, p.price, p.category_id, c.name,
		       p.stock, p.image_urls, p.brand, p.weight_kg, p.attributes,
		       p.featured, p.rating, p.review_count, p.created_at
		FROM products p
		JOIN categories c ON c.id = p.category_id
		%s
		ORDER BY p.%s %s
		LIMIT $%d OFFSET $%d`, where, sortBy, sortOrder, argIdx, argIdx+1)

	rows, err := h.db.Query(ctx, query, args...)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var products []*v1.Product
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		products = append(products, p)
	}

	return connect.NewResponse(&v1.ListProductsResponse{
		Products: products,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}), nil
}

func (h *ProductHandler) SearchProducts(ctx context.Context, req *connect.Request[v1.SearchProductsRequest]) (*connect.Response[v1.SearchProductsResponse], error) {
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

	pattern := "%" + msg.Query + "%"

	var total int32
	h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.name ILIKE $1 OR p.description ILIKE $1 OR p.brand ILIKE $1`,
		pattern).Scan(&total)

	rows, err := h.db.Query(ctx, `
		SELECT p.id, p.name, p.description, p.price, p.category_id, c.name,
		       p.stock, p.image_urls, p.brand, p.weight_kg, p.attributes,
		       p.featured, p.rating, p.review_count, p.created_at
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.name ILIKE $1 OR p.description ILIKE $1 OR p.brand ILIKE $1
		ORDER BY p.name
		LIMIT $2 OFFSET $3`, pattern, pageSize, offset)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var products []*v1.Product
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		products = append(products, p)
	}

	return connect.NewResponse(&v1.SearchProductsResponse{
		Products: products,
		Total:    total,
	}), nil
}

func (h *ProductHandler) ListCategories(ctx context.Context, req *connect.Request[v1.ListCategoriesRequest]) (*connect.Response[v1.ListCategoriesResponse], error) {
	rows, err := h.db.Query(ctx, `
		SELECT c.id, c.name, c.description, c.slug, c.icon,
		       COUNT(p.id) as product_count
		FROM categories c
		LEFT JOIN products p ON p.category_id = c.id
		GROUP BY c.id
		ORDER BY c.name`)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var categories []*v1.Category
	for rows.Next() {
		var cat v1.Category
		if err := rows.Scan(&cat.Id, &cat.Name, &cat.Description, &cat.Slug, &cat.Icon, &cat.ProductCount); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		categories = append(categories, &cat)
	}

	return connect.NewResponse(&v1.ListCategoriesResponse{Categories: categories}), nil
}

func (h *ProductHandler) GetProductsByCategory(ctx context.Context, req *connect.Request[v1.GetProductsByCategoryRequest]) (*connect.Response[v1.GetProductsByCategoryResponse], error) {
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
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM products WHERE category_id = $1`, msg.CategoryId).Scan(&total)

	rows, err := h.db.Query(ctx, `
		SELECT p.id, p.name, p.description, p.price, p.category_id, c.name,
		       p.stock, p.image_urls, p.brand, p.weight_kg, p.attributes,
		       p.featured, p.rating, p.review_count, p.created_at
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.category_id = $1
		ORDER BY p.name
		LIMIT $2 OFFSET $3`, msg.CategoryId, pageSize, offset)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var products []*v1.Product
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		products = append(products, p)
	}

	return connect.NewResponse(&v1.GetProductsByCategoryResponse{
		Products: products,
		Total:    total,
	}), nil
}

func (h *ProductHandler) GetFeaturedProducts(ctx context.Context, req *connect.Request[v1.GetFeaturedProductsRequest]) (*connect.Response[v1.GetFeaturedProductsResponse], error) {
	limit := int32(8)
	if req.Msg.Limit > 0 {
		limit = req.Msg.Limit
	}

	rows, err := h.db.Query(ctx, `
		SELECT p.id, p.name, p.description, p.price, p.category_id, c.name,
		       p.stock, p.image_urls, p.brand, p.weight_kg, p.attributes,
		       p.featured, p.rating, p.review_count, p.created_at
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.featured = true
		ORDER BY p.rating DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var products []*v1.Product
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		products = append(products, p)
	}

	return connect.NewResponse(&v1.GetFeaturedProductsResponse{Products: products}), nil
}

type scanner interface {
	Scan(dest ...interface{}) error
}

func scanProduct(s scanner) (*v1.Product, error) {
	var p v1.Product
	var imageURLs []string
	var attrs map[string]string
	var createdAt time.Time

	err := s.Scan(
		&p.Id, &p.Name, &p.Description, &p.Price,
		&p.CategoryId, &p.CategoryName,
		&p.Stock, &imageURLs, &p.Brand, &p.WeightKg,
		&attrs, &p.Featured, &p.Rating, &p.ReviewCount, &createdAt,
	)
	if err != nil {
		return nil, err
	}

	p.ImageUrls = imageURLs
	p.Attributes = attrs
	p.CreatedAt = timestamppb.New(createdAt)

	// round rating
	p.Rating = math.Round(p.Rating*10) / 10

	return &p, nil
}

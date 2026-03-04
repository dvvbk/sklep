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
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type UserHandler struct {
	db *pgxpool.Pool
}

func NewUserHandler(db *pgxpool.Pool) *UserHandler {
	return &UserHandler{db: db}
}

func (h *UserHandler) Register(ctx context.Context, req *connect.Request[v1.RegisterRequest]) (*connect.Response[v1.RegisterResponse], error) {
	msg := req.Msg

	var exists bool
	h.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", msg.Email).Scan(&exists)
	if exists {
		return nil, connect.NewError(connect.CodeAlreadyExists, fmt.Errorf("email already registered"))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(msg.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	id := uuid.New().String()
	now := time.Now()

	_, err = h.db.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, first_name, last_name, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		id, msg.Email, string(hash), msg.FirstName, msg.LastName, now)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	token, err := middleware.GenerateToken(id, msg.Email)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.RegisterResponse{
		User: &v1.User{
			Id:        id,
			Email:     msg.Email,
			FirstName: msg.FirstName,
			LastName:  msg.LastName,
			CreatedAt: timestamppb.New(now),
		},
		Token: token,
	}), nil
}

func (h *UserHandler) Login(ctx context.Context, req *connect.Request[v1.LoginRequest]) (*connect.Response[v1.LoginResponse], error) {
	msg := req.Msg

	var id, passwordHash, firstName, lastName, phone, address, city, postalCode string
	var createdAt time.Time

	err := h.db.QueryRow(ctx, `
		SELECT id, password_hash, first_name, last_name,
		       COALESCE(phone,''), COALESCE(address,''), COALESCE(city,''), COALESCE(postal_code,''),
		       created_at
		FROM users WHERE email = $1`, msg.Email).
		Scan(&id, &passwordHash, &firstName, &lastName, &phone, &address, &city, &postalCode, &createdAt)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid email or password"))
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(msg.Password)); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid email or password"))
	}

	token, err := middleware.GenerateToken(id, msg.Email)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.LoginResponse{
		User: &v1.User{
			Id:         id,
			Email:      msg.Email,
			FirstName:  firstName,
			LastName:   lastName,
			Phone:      phone,
			Address:    address,
			City:       city,
			PostalCode: postalCode,
			CreatedAt:  timestamppb.New(createdAt),
		},
		Token: token,
	}), nil
}

func (h *UserHandler) GetProfile(ctx context.Context, req *connect.Request[v1.GetProfileRequest]) (*connect.Response[v1.GetProfileResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	user, err := h.getUserByID(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	return connect.NewResponse(&v1.GetProfileResponse{User: user}), nil
}

func (h *UserHandler) UpdateProfile(ctx context.Context, req *connect.Request[v1.UpdateProfileRequest]) (*connect.Response[v1.UpdateProfileResponse], error) {
	claims, err := middleware.ValidateToken(req.Msg.Token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	msg := req.Msg
	_, err = h.db.Exec(ctx, `
		UPDATE users SET first_name=$1, last_name=$2, phone=$3, address=$4, city=$5, postal_code=$6
		WHERE id=$7`,
		msg.FirstName, msg.LastName, msg.Phone, msg.Address, msg.City, msg.PostalCode, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	user, err := h.getUserByID(ctx, claims.UserID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&v1.UpdateProfileResponse{User: user}), nil
}

func (h *UserHandler) getUserByID(ctx context.Context, id string) (*v1.User, error) {
	var u v1.User
	var createdAt time.Time
	err := h.db.QueryRow(ctx, `
		SELECT id, email, first_name, last_name,
		       COALESCE(phone,''), COALESCE(address,''), COALESCE(city,''), COALESCE(postal_code,''),
		       created_at
		FROM users WHERE id = $1`, id).
		Scan(&u.Id, &u.Email, &u.FirstName, &u.LastName,
			&u.Phone, &u.Address, &u.City, &u.PostalCode, &createdAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = timestamppb.New(createdAt)
	return &u, nil
}

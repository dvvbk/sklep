package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"connectrpc.com/connect"
	"connectrpc.com/grpchealth"
	"connectrpc.com/grpcreflect"
	"github.com/rs/cors"
	"github.com/sklep/golden-fish/gen/golden_fish/v1/golden_fishv1connect"
	"github.com/sklep/golden-fish/internal/db"
	"github.com/sklep/golden-fish/internal/handlers"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func main() {
	ctx := context.Background()

	pool, err := db.NewPool(ctx)
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer pool.Close()

	log.Println("Connected to database")

	productHandler := handlers.NewProductHandler(pool)
	userHandler := handlers.NewUserHandler(pool)
	cartHandler := handlers.NewCartHandler(pool)
	orderHandler := handlers.NewOrderHandler(pool)

	mux := http.NewServeMux()

	compress1KB := connect.WithCompressMinBytes(1024)

	productPath, productSvc := golden_fishv1connect.NewProductServiceHandler(productHandler, compress1KB)
	userPath, userSvc := golden_fishv1connect.NewUserServiceHandler(userHandler, compress1KB)
	cartPath, cartSvc := golden_fishv1connect.NewCartServiceHandler(cartHandler, compress1KB)
	orderPath, orderSvc := golden_fishv1connect.NewOrderServiceHandler(orderHandler, compress1KB)

	mux.Handle(productPath, productSvc)
	mux.Handle(userPath, userSvc)
	mux.Handle(cartPath, cartSvc)
	mux.Handle(orderPath, orderSvc)

	// Health check
	checker := grpchealth.NewStaticChecker(
		golden_fishv1connect.ProductServiceName,
		golden_fishv1connect.UserServiceName,
		golden_fishv1connect.CartServiceName,
		golden_fishv1connect.OrderServiceName,
	)
	mux.Handle(grpchealth.NewHandler(checker))

	// Reflection (for tools like grpcurl)
	reflector := grpcreflect.NewStaticReflector(
		golden_fishv1connect.ProductServiceName,
		golden_fishv1connect.UserServiceName,
		golden_fishv1connect.CartServiceName,
		golden_fishv1connect.OrderServiceName,
	)
	mux.Handle(grpcreflect.NewHandlerV1(reflector))
	mux.Handle(grpcreflect.NewHandlerV1Alpha(reflector))

	corsHandler := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "CONNECT"},
		AllowedHeaders: []string{
			"Accept",
			"Authorization",
			"Content-Type",
			"Connect-Protocol-Version",
			"Connect-Timeout-Ms",
			"Grpc-Timeout",
			"X-Grpc-Web",
			"X-User-Agent",
		},
		ExposedHeaders: []string{
			"Grpc-Status",
			"Grpc-Message",
			"Grpc-Status-Details-Bin",
		},
		AllowCredentials: false,
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	log.Printf("Starting Złota Rybka gRPC server on %s", addr)

	if err := http.ListenAndServe(
		addr,
		h2c.NewHandler(corsHandler.Handler(mux), &http2.Server{}),
	); err != nil {
		log.Fatalf("listen and serve: %v", err)
	}
}

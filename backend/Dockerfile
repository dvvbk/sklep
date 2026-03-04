FROM golang:alpine AS builder

RUN apk add --no-cache git curl

# Install buf
RUN curl -sSL "https://github.com/bufbuild/buf/releases/download/v1.66.0/buf-Linux-x86_64" -o /usr/local/bin/buf \
    && chmod +x /usr/local/bin/buf

# Install protoc-gen-go and protoc-gen-connect-go
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest \
    && go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest

WORKDIR /app

COPY go.mod go.sum* ./
COPY . .

# Generate protobuf code first (creates gen/ so go mod tidy can resolve local imports)
RUN buf generate

# Regenerate go.sum with fresh checksums
RUN rm -f go.sum && GONOSUMDB="*" go mod tidy

# Build the server
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# ---
FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Europe/Warsaw

COPY --from=builder /server /server

EXPOSE 8080

CMD ["/server"]

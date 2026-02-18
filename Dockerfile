ARG GO_VERSION=1.21
FROM golang:${GO_VERSION}-alpine AS builder

WORKDIR /feishu2md

COPY go.mod go.sum ./
RUN go mod download

COPY core  ./core
COPY web ./web
COPY utils ./utils
RUN go build -o ./feishu2md4web ./web/*.go

FROM alpine:latest
RUN apk update && apk add --no-cache ca-certificates

ENV GIN_MODE=release
ENV DATA_DIR=/data

COPY --from=builder /feishu2md/feishu2md4web ./

VOLUME /data

EXPOSE 8080

ENTRYPOINT ["./feishu2md4web"]

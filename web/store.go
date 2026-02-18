package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type Store struct {
	dir string
	mu  sync.RWMutex
}

type SavedDocument struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Markdown  string `json:"markdown"`
	CreatedAt string `json:"created_at"`
}

func NewStore() (*Store, error) {
	dir := os.Getenv("DATA_DIR")
	if dir == "" {
		dir = "data"
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create data dir: %w", err)
	}
	return &Store{dir: dir}, nil
}

func (s *Store) Save(title, markdown string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := generateShortID()
	doc := SavedDocument{
		ID:        id,
		Title:     title,
		Markdown:  markdown,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	data, err := json.Marshal(doc)
	if err != nil {
		return "", err
	}
	path := filepath.Join(s.dir, id+".json")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", err
	}
	return id, nil
}

func (s *Store) Get(id string) (*SavedDocument, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Sanitize id to prevent path traversal
	id = filepath.Base(id)
	path := filepath.Join(s.dir, id+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var doc SavedDocument
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, err
	}
	return &doc, nil
}

func generateShortID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// Global store instance
var store *Store

func initStore() {
	var err error
	store, err = NewStore()
	if err != nil {
		log.Fatalf("Failed to initialize store: %s", err)
	}
}

type SaveRequest struct {
	Title    string `json:"title"`
	Markdown string `json:"markdown"`
}

func saveHandler(c *gin.Context) {
	var req SaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if req.Markdown == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Markdown content is required"})
		return
	}

	if req.Title == "" {
		req.Title = "Untitled"
	}

	id, err := store.Save(req.Title, req.Markdown)
	if err != nil {
		log.Printf("error: store.Save: %s", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":  id,
		"url": fmt.Sprintf("/view/%s", id),
	})
}

func viewHandler(c *gin.Context) {
	id := c.Param("id")
	doc, err := store.Get(id)
	if err != nil {
		c.HTML(http.StatusNotFound, "view.templ.html", gin.H{
			"Error": "Document not found",
		})
		return
	}

	c.HTML(http.StatusOK, "view.templ.html", gin.H{
		"Title":    doc.Title,
		"Markdown": doc.Markdown,
	})
}

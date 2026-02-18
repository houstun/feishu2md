package main

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/88250/lute"
	"github.com/Wsine/feishu2md/core"
	"github.com/Wsine/feishu2md/utils"
	"github.com/gin-gonic/gin"
)

// ConvertResponse is the JSON response for the /convert endpoint
type ConvertResponse struct {
	Title    string `json:"title"`
	Markdown string `json:"markdown"`
}

func newClientAndConfig() (*core.Client, *core.Config) {
	config := core.NewConfig(
		os.Getenv("FEISHU_APP_ID"),
		os.Getenv("FEISHU_APP_SECRET"),
	)
	client := core.NewClient(
		config.Feishu.AppId, config.Feishu.AppSecret,
	)
	return client, config
}

func resolveDocTypeAndToken(ctx context.Context, client *core.Client, docType, docToken string) (string, string, error) {
	if docType == "wiki" {
		node, err := client.GetWikiNodeInfo(ctx, docToken)
		if err != nil {
			return "", "", fmt.Errorf("client.GetWikiNodeInfo: %w", err)
		}
		docType = node.ObjType
		docToken = node.ObjToken
	}
	if docType == "docs" {
		return "", "", fmt.Errorf("unsupported docs document type")
	}
	return docType, docToken, nil
}

func convertHandler(c *gin.Context) {
	feishuDocxURL, err := url.QueryUnescape(c.Query("url"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encoded feishu/larksuite URL"})
		return
	}

	docType, docToken, err := utils.ValidateDocumentURL(feishuDocxURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feishu/larksuite document URL"})
		return
	}

	ctx := context.Background()
	client, config := newClientAndConfig()

	docType, docToken, err = resolveDocTypeAndToken(ctx, client, docType, docToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	docx, blocks, err := client.GetDocxContent(ctx, docToken)
	if err != nil {
		log.Printf("error: GetDocxContent: %s", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get document content"})
		return
	}

	parser := core.NewParser(config.Output)
	markdown := parser.ParseDocxContent(docx, blocks)

	// Replace image tokens with proxy URLs
	for _, imgToken := range parser.ImgTokens {
		proxyURL := fmt.Sprintf("/image/%s", imgToken)
		markdown = strings.Replace(markdown, imgToken, proxyURL, 1)
	}

	engine := lute.New(func(l *lute.Lute) {
		l.RenderOptions.AutoSpace = true
	})
	result := engine.FormatStr("md", markdown)

	c.JSON(http.StatusOK, ConvertResponse{
		Title:    docx.Title,
		Markdown: result,
	})
}

func imageProxyHandler(c *gin.Context) {
	imgToken := c.Param("token")
	if imgToken == "" {
		c.String(http.StatusBadRequest, "Missing image token")
		return
	}

	ctx := context.Background()
	client, config := newClientAndConfig()

	_, rawImage, err := client.DownloadImageRaw(ctx, imgToken, config.Output.ImageDir)
	if err != nil {
		log.Printf("error: DownloadImageRaw: %s", err)
		c.String(http.StatusInternalServerError, "Failed to download image")
		return
	}

	// Detect content type from image bytes
	contentType := http.DetectContentType(rawImage)
	c.Header("Cache-Control", "public, max-age=86400")
	c.Data(http.StatusOK, contentType, rawImage)
}

func downloadHandler(c *gin.Context) {
	// get parameters
	feishu_docx_url, err := url.QueryUnescape(c.Query("url"))
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid encoded feishu/larksuite URL")
		return
	}

	// Validate the url to download
	docType, docToken, err := utils.ValidateDocumentURL(feishu_docx_url)
	fmt.Println("Captured document token:", docToken)

	// Create client with context
	ctx := context.Background()
	config := core.NewConfig(
		os.Getenv("FEISHU_APP_ID"),
		os.Getenv("FEISHU_APP_SECRET"),
	)
	client := core.NewClient(
		config.Feishu.AppId, config.Feishu.AppSecret,
	)

	// Process the download
	parser := core.NewParser(config.Output)
	markdown := ""

	// for a wiki page, we need to renew docType and docToken first
	if docType == "wiki" {
		node, err := client.GetWikiNodeInfo(ctx, docToken)
		if err != nil {
			c.String(http.StatusInternalServerError, "Internal error: client.GetWikiNodeInfo")
			log.Panicf("error: %s", err)
			return
		}
		docType = node.ObjType
		docToken = node.ObjToken
	}
	if docType == "docs" {
		c.String(http.StatusBadRequest, "Unsupported docs document type")
		return
	}

	docx, blocks, err := client.GetDocxContent(ctx, docToken)
	if err != nil {
		c.String(http.StatusInternalServerError, "Internal error: client.GetDocxContent")
		log.Panicf("error: %s", err)
		return
	}
	markdown = parser.ParseDocxContent(docx, blocks)

	zipBuffer := new(bytes.Buffer)
	writer := zip.NewWriter(zipBuffer)
	for _, imgToken := range parser.ImgTokens {
		localLink, rawImage, err := client.DownloadImageRaw(ctx, imgToken, config.Output.ImageDir)
		if err != nil {
			c.String(http.StatusInternalServerError, "Internal error: client.DownloadImageRaw")
			log.Panicf("error: %s", err)
			return
		}
		markdown = strings.Replace(markdown, imgToken, localLink, 1)
		f, err := writer.Create(localLink)
		if err != nil {
			c.String(http.StatusInternalServerError, "Internal error: zipWriter.Create")
			log.Panicf("error: %s", err)
			return
		}
		_, err = f.Write(rawImage)
		if err != nil {
			c.String(http.StatusInternalServerError, "Internal error: zipWriter.Create.Write")
			log.Panicf("error: %s", err)
			return
		}
	}

	engine := lute.New(func(l *lute.Lute) {
		l.RenderOptions.AutoSpace = true
	})
	result := engine.FormatStr("md", markdown)

	// Set response
	if len(parser.ImgTokens) > 0 {
		mdName := fmt.Sprintf("%s.md", docToken)
		f, err := writer.Create(mdName)
		if err != nil {
			c.String(http.StatusInternalServerError, "Internal error: zipWriter.Create")
			log.Panicf("error: %s", err)
			return
		}
		_, err = f.Write([]byte(result))
		if err != nil {
			c.String(http.StatusInternalServerError, "Internal error: zipWriter.Create.Write")
			log.Panicf("error: %s", err)
			return
		}

		err = writer.Close()
		if err != nil {
			c.String(http.StatusInternalServerError, "Internal error: zipWriter.Close")
			log.Panicf("error: %s", err)
			return
		}
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.zip"`, docToken))
		c.Data(http.StatusOK, "application/octet-stream", zipBuffer.Bytes())
	} else {
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.md"`, docToken))
		c.Data(http.StatusOK, "application/octet-stream", []byte(result))
	}
}

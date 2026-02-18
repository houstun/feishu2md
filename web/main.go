package main

import (
	"embed"
	"html/template"
	"log"
	"net/http"
	"os"

	"github.com/Wsine/feishu2md/utils"
	"github.com/gin-gonic/gin"
)

//go:embed templ/*
var f embed.FS

func main() {
	if mode := os.Getenv("GIN_MODE"); mode != "release" {
		utils.LoadEnv()
	}

	initStore()

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	templ := template.Must(template.New("").ParseFS(f, "templ/*.templ.html"))
	router.SetHTMLTemplate(templ)

	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.templ.html", nil)
	})
	router.GET("/download", downloadHandler)
	router.GET("/convert", convertHandler)
	router.GET("/image/:token", imageProxyHandler)
	router.POST("/save", saveHandler)
	router.GET("/view/:id", viewHandler)

	if err := router.Run(); err != nil {
		log.Panicf("error: %s", err)
	}
}

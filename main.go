package main

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func (a *App) ListFiles(root string, keywords string) ([][2]interface{}, error) {
    ctx, cancel := context.WithCancel(a.ctx)
    a.cancel = cancel
    defer cancel()
    matches := [][2]interface{}{}
    count := 0
    keywordList := strings.Split(keywords, ";")
    err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
        if err != nil {
            if os.IsNotExist(err) {
                return nil
            }
            return err
        }
        for _, keyword := range keywordList {
            if info.IsDir() && info.Name() == keyword {
                ignored := checkAttribute(path, "com.dropbox.ignored")
                matches = append(matches, [2]interface{}{path, ignored})
                return filepath.SkipDir
            }
            if !info.IsDir() && info.Name() == keyword {
                ignored := checkAttribute(path, "com.dropbox.ignored")
                matches = append(matches, [2]interface{}{path, ignored})
            }
        }
        count++
        wailsRuntime.EventsEmit(a.ctx, "fileCount", count)
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            return nil
        }
    })
    return matches, err
}

func (a *App) CancelSearch() {
    if a.cancel != nil {
        a.cancel()
        a.cancel = nil
    }
}

func checkAttribute(path string, attr string) bool {
    switch runtime.GOOS {
    case "windows":
        streamName := fmt.Sprintf("%s:%s", path, attr)
        _, err := os.Open(streamName)
        return err == nil
    case "darwin":
        err := exec.Command("xattr", "-p", attr, path).Run()
        return err == nil
    case "linux":
        err := exec.Command("attr", "-g", attr, path).Run()
        return err == nil
    default:
        return false
    }
}

func (a *App) SelectFolder() (string, error) {
    folder, err := wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{Title: "Please select Dropbox folder."})
    if err != nil {
        return "", err
    }
    return folder, nil
}

func (a *App) SetDropboxIgnored(paths []string) []string {
    results := []string{}
    for _, path := range paths {
        err := setAttribute(path, "com.dropbox.ignored", "1")
        if err != nil {
            results = append(results, fmt.Sprintf("Error ignoring %s: %s", path, err.Error()))
        } else {
            results = append(results, fmt.Sprintf("Ignored: %s", path))
        }
    }
    return results
}

func (a *App) RemoveDropboxIgnored(paths []string) []string {
    results := []string{}
    for _, path := range paths {
        err := removeAttribute(path, "com.dropbox.ignored")
        if err != nil {
            results = append(results, fmt.Sprintf("Error unignoring %s: %s", path, err.Error()))
        } else {
            results = append(results, fmt.Sprintf("Unignored: %s", path))
        }
    }
    return results
}

func setAttribute(path string, attr string, value string) error {
    switch runtime.GOOS {
    case "windows":
        streamName := fmt.Sprintf("%s:%s", path, attr)
        file, err := os.OpenFile(streamName, os.O_WRONLY|os.O_CREATE, 0666)
        if err != nil {
            return err
        }
        defer file.Close()
        _, err = file.Write([]byte(value))
        return err
    case "darwin":
        return exec.Command("xattr", "-w", attr, value, path).Run()
    case "linux":
        return exec.Command("attr", "-s", attr, "-V", value, path).Run()
    default:
        return fmt.Errorf("unsupported platform")
    }
}

func removeAttribute(path string, attr string) error {
    switch runtime.GOOS {
    case "windows":
        streamName := fmt.Sprintf("%s:%s", path, attr)
        return os.Remove(streamName)
    case "darwin":
        return exec.Command("xattr", "-d", attr, path).Run()
    case "linux":
        return exec.Command("attr", "-r", attr, path).Run()
    default:
        return fmt.Errorf("unsupported platform")
    }
}

func main() {
	// Create an instance of the app structure
	app := &App{}

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Dropbox Sync Skipper",
		Width:  1024,
		Height: 768,
		MinWidth: 640,
		MinHeight: 480,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

type App struct {
    ctx context.Context
    cancel context.CancelFunc
}

func (a *App) startup(ctx context.Context) {
    a.ctx, a.cancel = context.WithCancel(ctx)
}
#!/bin/bash

# .envファイルの読み込み
export $(grep -v '^#' .env | xargs)

# アプリの署名
codesign --deep --force --verify --verbose --options runtime --sign "$DEVELOPER_ID_APP" "$APP_PATH"

# dmgの作成と署名
create-dmg "$APP_PATH" "$OUTPUT_PATH" --overwrite

# ノータライズのリクエスト
xcrun notarytool submit "$OUTPUT_PATH/$APP_NAME 1.0.0.dmg" --apple-id "$APPLE_ID" --password "$APP_SPECIFIC_PASSWORD" --team-id "$TEAM_ID"

sleep 20

# ノータライズの確認とステープルの追加
xcrun stapler staple "$OUTPUT_PATH/$APP_NAME 1.0.0.dmg"
# Dropbox Sync Skipper

- If you want to sync your source code with Dropbox but exclude specific files or folders (e.g., node_modules or dist folders), this app allows you to apply Dropbox exclusion settings in bulk based on specified conditions. The app operates according to Dropbox's specifications: it uses NTFS alternate data streams on Windows and extended attributes on macOS/Linux. The content of the files themselves is not altered, but use it at your own risk.

---

- あなたがソースコードを Dropbox で同期したい場合に、特定のファイルやフォルダ（例えば、node_modules フォルダや dist フォルダ）は除外したいことがあるでしょう。このアプリは条件を指定して一括で Dropbox の除外設定を適用できます。動作原理は Dropbox の仕様に準じており、Windows では NTFS の代替ファイルストリーム、MacOS/Linux では拡張属性を書き換えます。ファイルの内容自体は変更されませんが、自己責任でお使いください。

<img width="606" alt="スクリーンショット 2024-06-20 16 30 07" src="https://github.com/Jun-Murakami/dropboxskipper/assets/126404131/1fd63b25-a68d-45cb-ad40-cb38f8c5d58d">

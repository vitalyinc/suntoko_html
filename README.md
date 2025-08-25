# Suntoko HTML

サントコ株式会社のコーポレートサイトの静的HTMLファイルです。

## アクセス情報

**サイトURL (Basic認証付き):** https://d3196yqo5fsvsr.cloudfront.net

**Basic認証情報:**
- ユーザー名: `suntoko`
- パスワード: `suntoko2025!`

## デプロイ情報

### 現在の設定
- **CloudFront Distribution ID:** E2FYRV95ORCFM
- **S3バケット:** suntoko-production-application
- **SSMパラメータ:** suntoko-production-auth-user / suntoko-production-auth-pass
- **Basic認証:** Lambda@Edge で有効

### HTMLファイルの更新・デプロイ
HTMLファイルの更新時は、以下のコマンドでS3に同期してCloudFrontキャッシュを無効化：

```bash
# S3に同期
aws s3 sync ./ s3://suntoko-production-application/ --exclude ".git/*" --exclude ".*" --exclude "Makefile" --exclude "templates/*" --exclude "README.md" --delete

# CloudFrontキャッシュ無効化
aws cloudfront create-invalidation --distribution-id E2FYRV95ORCFM --paths '/*'
```

### インフラの再構築
```bash
make cloudfront PROJECT=suntoko ENV=production
```
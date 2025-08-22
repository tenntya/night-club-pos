#!/bin/bash

# GitHub Personal Access Token設定スクリプト

echo "GitHub Personal Access Token設定ツール"
echo "======================================"
echo ""
echo "トークンを取得済みの場合は、以下の手順で設定してください："
echo ""

# トークン入力
read -p "GitHub Personal Access Token (ghp_xxx...): " GITHUB_TOKEN

# トークンが入力されたか確認
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ トークンが入力されていません"
    exit 1
fi

# GitHub CLIで認証
echo "$GITHUB_TOKEN" | gh auth login --with-token

# 認証確認
if gh auth status &>/dev/null; then
    echo "✅ GitHub認証成功！"
    echo ""
    
    # ユーザー名取得
    USERNAME=$(gh api user --jq .login)
    echo "ログインユーザー: $USERNAME"
    echo ""
    
    # リポジトリ作成とプッシュ
    echo "リポジトリを作成してプッシュしますか？"
    read -p "続行する場合は 'yes' と入力: " CONFIRM
    
    if [ "$CONFIRM" = "yes" ]; then
        # リポジトリ作成
        echo "リポジトリを作成中..."
        gh repo create night-club-pos --public --source=. --remote=origin --push
        
        if [ $? -eq 0 ]; then
            echo "✅ リポジトリ作成とプッシュ完了！"
            echo ""
            echo "📦 リポジトリURL: https://github.com/$USERNAME/night-club-pos"
            echo ""
            
            # GitHub Pages有効化
            echo "GitHub Pagesを有効化しています..."
            gh api repos/$USERNAME/night-club-pos/pages \
                --method POST \
                --field source='{"branch":"main","path":"/"}' \
                2>/dev/null || echo "※ GitHub Pagesは手動で有効化してください"
            
            echo ""
            echo "🌐 公開URL (数分後にアクセス可能): https://$USERNAME.github.io/night-club-pos/"
            echo ""
            echo "================================"
            echo "✅ セットアップ完了！"
            echo "================================"
            echo ""
            echo "次のステップ:"
            echo "1. 数分待ってから公開URLにアクセス"
            echo "2. もしアクセスできない場合："
            echo "   - https://github.com/$USERNAME/night-club-pos/settings/pages"
            echo "   - Source: Deploy from a branch"
            echo "   - Branch: main / (root)"
            echo "   - Save"
        else
            echo "❌ リポジトリ作成に失敗しました"
            echo "既に同名のリポジトリが存在する可能性があります"
        fi
    else
        echo "キャンセルしました"
    fi
else
    echo "❌ GitHub認証に失敗しました"
    echo "トークンを確認してください"
fi
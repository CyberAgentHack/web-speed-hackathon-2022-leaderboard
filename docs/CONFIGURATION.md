## 設定方法

ここでは、開催期間外に fork して本リーダーボードを使うために必要な設定について説明します。

### 1. 開催期間の設定

`.github/workflows/scoring.yml` 内にある `payload` ジョブに競技の開始・終了日時が設定されています。

### 2. 対象 URL の設定

GitHub リポジトリの Secrets を開き、`WSH_SCORING_TARGET_PATHS` に 以下のように JavaScript の配列形式で Lighthouse の測定対象 URL を指定します。
対象 URL の選定は、[開催時の採点ルール](https://github.com/CyberAgentHack/web-speed-hackathon-2022#%E6%8E%A1%E7%82%B9)を参考にするのがおすすめです。

```javascript
['/', '/races/95de6561-c8b8-42eb-94c7-6952b73cd52c/race-card', ...]
```

また、問題側のリポジトリで取り組む期間に合わせてデータの再生成を行った場合、VRT についても対象 URL を設定する必要があります。
`scripts/vrt/config/local.yml` を開き、各項目に該当する URL を設定してください。

### 3. VRT 画像の更新

この状態で一度計測を実行します。このとき、Artifacts から VRT を実行した際のキャプチャデータが取得できます。
これらの画像を `scripts/vrt/expected` フォルダに配置して再度計測することで、差分がなく完了すれば問題ありません。

### 4. ランキングのリセット

先頭行を除いて `score.csv` の内容を削除し、`README.md` のランキング箇所を以下で置き換えます。

```
<!-- leaderboard:start -->

| Rank | Score |     | CompetitorId | URL |
| :--: | :---: | :-: | :----------- | :-: |
|      |       |     |              |     |

<!-- leaderboard:end -->
```

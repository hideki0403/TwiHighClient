@echo off
echo キーを押すとこのディレクトリにTwiHigh仮実行に必要なNode.jsライブラリを構成します。
echo なお、一部のライブラリのインストールにはgitを必要とします。gitがインストールされていないパソコンで実行された場合は正常にライブラリ構成を行えない可能性があります。
PAUSE
npm i -save twitter electron electron-oauth-twitter discord-rich-presence

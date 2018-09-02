'use strict'

const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const dialog = electron.dialog

const https = require('https')
const fs = require('fs')
const twitterOauth = require('electron-oauth-twitter')

var mainWindow = null
var loadingWindow = null

var appVersion = JSON.parse(fs.readFileSync(__dirname + '/version.json'))

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin')
        app.quit
})

app.on('ready', function() {
    // LoadingWindow
    loadingWindow = new BrowserWindow({width: 250, height: 350, movable: false, frame: false})
    loadingWindow.loadURL('file://' + __dirname + '/lib/html/loading.html')

    // CheckUpdate
    https.get('https://raw.githubusercontent.com/hideki0403/TwiHigh/master/version.json', (res) => {
        let body = ''
        res.setEncoding('utf8')

        res.on('data', (chunk) => {
            body += chunk
        })

        res.on('end', (res) => {
            res = JSON.parse(body)
            if(appVersion.version !== res.version) {
                if(res.forced === true) {
                    // 強制アプデ処理
                } {
                    // アップデートお知らせ処理
                }
            }
        })
    })

    //CheckTokens
    var twitterTokensAllive = fs.readdirSync(__dirname + '/lib/tokens')
    if(twitterTokensAllive.length === 0) {
        const OauthTwitterAccount = new twitterOauth({
            key: "WW22cp6IEPXzE92porqQxVeXc",
            secret: "J2VJEi3ia3EesafUkS64GS6B0j9lmXSdIbtp1NpBXUA9BlOLK1",
        })

        OauthTwitterAccount.startRequest()
            .then((result) => {
                fs.writeFileSync(__dirname + '/lib/tokens/tmp.json', result)
            }).catch((error) => {
                console.error(error, error.stack)
                dialog.showMessageBox({type: 'info', message: '認証エラーです。終了します。'}, function() {
                    loadingWindow = null
                })
            })
    } else {
        // tokenがあった場合の処理
        
    }

    loadingWindow.on('closed', function() {
        loadingWindow = null
    })
})



// DiscordRPC

const client = require('discord-rich-presence')('483959392136593409')

var date = new Date()
var a = date.getTime()
var b = Math.floor(a / 1000)

client.updatePresence({
    state: '',
    details: '',
    largeImageKey: '',
    largeImageText: '',
    smallImageKey: '',
    smallImageText: 'TwiHigh（ツイ廃）: ツイ廃向けTwitterクライアント',
    startTimestamp: b,
    instance: true,
})
'use strict'

const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipc = requrie('ipc')
const http = require('http')

var mainWindow = null

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin')
        app.quit
})

app.on('ready', function() {
    mainWindow = new BrowserWindow({width: 800, height: 600})
    mainWindow.loadURL('file://' + __dirname + '/index.html')

    mainWindow.on('closed', function() {
        mainWindow = null
    })
})

// 1000msごとにNIED鯖から受信
setInterval(function() {
    var date = new Date()
    var urlDate = '' + date.getFullYear() + ('0' + (date.getMonth() + 1)).slice(-2) + ('0' + date.getDate()).slice(-2) + ('0' + date.getHours()).slice(-2) + ('0' + date.getMinutes()).slice(-2) + ('0' + date.getSeconds()).slice(-2)
    var url = 'http://www.kmoni.bosai.go.jp/new/webservice/hypo/eew/' + urlDate + '.json'
    http.get(url, (res) => {
        let body = ''
        res.setEncoding('utf8')

        res.on('data', (chunk) => {
            body += chunk
        })

        res.on('end', (body) => {
            res = JSON.parse(body)
            current.webContents.on('did-finish-load', function () {
                current.webContents.send('asynchronous-message', res)
            })
        })
}, 1000)

// DiscordRPC

const client = require('discord-rich-presence')('483959392136593409')

var date = new Date()
var a = date.getTime()
var b = Math.floor(a / 1000)

client.updatePresence({
    state: 'Ver:1.0 / 起動から',
    details: '地震速報受信待機中...',
    largeImageKey: 'waiting',
    largeImageText: 'サーバー接続成功:待機中',
    smallImageKey: 'main',
    smallImageText: 'Earthquake Early Warning Plus Ver.1.0 (@hideki_0403)',
    startTimestamp: b,
    instance: true,
})
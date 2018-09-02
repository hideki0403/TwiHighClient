'use strict'

const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

const http = require('http')

var mainWindow = null
var loadingWindow = null

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin')
        app.quit
})

app.on('ready', function() {
    // LoadingWindow
    loadingWindow = new BrowserWindow({width: 250, height: 350, movable: false, frame: false})
    loadingWindow.loadURL('file://' + __dirname + '/lib/html/loading.html')

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
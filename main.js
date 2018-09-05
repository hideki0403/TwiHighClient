'use strict'

const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const dialog = electron.dialog
const ipc = electron.ipcMain
const Menu = electron.Menu

const https = require('https')
const fs = require('fs')
const Twitter = require('twitter')
const twitterOauth = require('electron-oauth-twitter')
const __config = JSON.parse(fs.readFileSync(__dirname + '/lib/settings/config.conf'))

var mainWindow = null
var loadingWindow = null

function isExistDir(dir) {
  try {
    fs.readDir(dir)
    return true
  } catch(err) {
    if(err.code === 'ENOENT') return false
  }
}

function alliveSystemDir(dirname) {
  if(isExistDir(__dirname + dirname) === false) {
    fs.mkdirSync(__dirname + dirname)
  }
}

alliveSystemDir('/lib/tokens')
alliveSystemDir('/lib/datas')


var appVersion = JSON.parse(fs.readFileSync(__dirname + '/version.json'))

var logIn = null

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin')
        app.quit
})

app.on('ready', function() {
    // LoadingWindow
    loadingWindow = new BrowserWindow({width: 250, height: 350, movable: false, frame: false})
    loadingWindow.loadURL('file://' + __dirname + '/lib/html/loading.html')

    loadingWindow.webContents.on('did-finish-load', () => {
      loadingWindow.show()

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
              } else {
                // アプデが存在しなかった場合
                loadingWindow.webContents.send('log', 'アップデート確認完了...アップデート無し (' + res.version + ')')
              }
          })
      })

      //CheckTokens
      var twitterTokensAllive = fs.readdirSync(__dirname + '/lib/tokens')
      if(twitterTokensAllive.length === 0) {
        loadingWindow.webContents.send('log', '登録されているアカウントがありません。認証ウインドウを開きます。')
          const OauthTwitterAccount = new twitterOauth({
              key: "WW22cp6IEPXzE92porqQxVeXc",
              secret: "J2VJEi3ia3EesafUkS64GS6B0j9lmXSdIbtp1NpBXUA9BlOLK1",
          })

          OauthTwitterAccount.startRequest()
              .then((result) => {
                var tokenDatas = {
                  key: result.oauth_access_token,
                  secret: result.oauth_access_token_secret
                }
                fs.writeFileSync(__dirname + '/lib/tokens/tmp.json', JSON.stringify(tokenDatas, null, ''))
                loadingWindow.webContents.send('log', '認証が完了しました。アプリを再起動します。')
                setTimeout(function() {
                  app.relaunch()
                  app.quit()
                }, 2000)

              }).catch((error) => {
                  console.error(error, error.stack)
                  dialog.showMessageBox({type: 'info', message: '認証エラーです。終了します。'}, function() {
                  })
                  loadingWindow.close()
              })
      } else {
          // tokenがあった場合の処理
          loadingWindow.webContents.send('log', 'アカウント認証済み(計' + twitterTokensAllive.length + 'アカウント)')

          if(twitterTokensAllive.indexOf('tmp.json') !== -1) {
            loadingWindow.webContents.send('log', '仮登録アカウントが見つかりました。情報取得を行います。')
            var tmpAccount = JSON.parse(fs.readFileSync(__dirname + '/lib/tokens/tmp.json'))
            var client = new Twitter({
              consumer_key: 'WW22cp6IEPXzE92porqQxVeXc',
              consumer_secret: 'J2VJEi3ia3EesafUkS64GS6B0j9lmXSdIbtp1NpBXUA9BlOLK1',
              access_token_key: tmpAccount.key,
              access_token_secret: tmpAccount.secret
            })

            var DD = new Date()
            var Hours = DD.getHours()
            var Minutes = DD.getMinutes()
            client.get('account/verify_credentials', function(error, tweets, response) {
              if(error) { return error }
              fs.renameSync(__dirname + '/lib/tokens/tmp.json', __dirname + '/lib/tokens/' + tweets.id + '.json')
              client.get('friends/ids', {user_id: tweets.id, count: 5000}, function(error2, tweets2, response2) {
                loadingWindow.webContents.send('log', '情報取得完了...アカウント名: @' + tweets.screen_name + '<br>フォロー数: ' + tweets2.ids.length + '<br>アプリを再起動します。')
                var followsList = {
                  date: Hours + '/' + Minutes,
                  follows: tweets2.ids
                }
                fs.writeFileSync(__dirname + '/lib/datas/followList-' + tweets.id + '.json', JSON.stringify(followsList, null, ''))
                setTimeout(function() {
                  app.relaunch()
                  app.quit()
                }, 5000)
              })
            })

          } else {
            loadingWindow.webContents.send('log', '起動準備完了...メインウインドウを起動します。')

            setTimeout(function() {
              // メインウインドウ起動
              mainWindow = new BrowserWindow({width: 1080, height: 720})
              mainWindow.loadURL('file://' + __dirname + '/lib/html/index.html')
              Menu.setApplicationMenu(menu)
              mainWindow.once('ready-to-show', () => {
                mainWindow.show()
              })
              loadingWindow.close()

              // ログイン指定。本来はconfigから取得！
              var logIn = twitterTokensAllive[0]
              var loginedAccount = JSON.parse(fs.readFileSync( __dirname + '/lib/tokens/' + logIn))

              var nativeID = logIn.replace('.json', '')

              // Client生成
              var client = new Twitter({
                consumer_key: 'WW22cp6IEPXzE92porqQxVeXc',
                consumer_secret: 'J2VJEi3ia3EesafUkS64GS6B0j9lmXSdIbtp1NpBXUA9BlOLK1',
                access_token_key: loginedAccount.key,
                access_token_secret: loginedAccount.secret
              })

              // Follows取得
              if(fs.readdirSync(__dirname + '/lib/datas') !== 0) {
                var DD = new Date()
                var Hours = DD.getHours()
                var Minutes = DD.getMinutes()
                var listF = JSON.parse(fs.readFileSync(__dirname + '/lib/datas/followList-' + nativeID + '.json'))
                if(listF.date !== Hours + '/' + Minutes) {
                  client.get('friends/ids', {user_id: nativeID, count: 700}, function(error2, tweets2, response2) {
                    var followsList = {
                      date: Hours + '/' + Minutes,
                      follows: tweets2.ids
                    }
                    fs.writeFileSync(__dirname + '/lib/datas/followList-' + nativeID + '.json', JSON.stringify(followsList, null, ''))
                  })
                  client.get('account/verify_credentials', function(error, tweets, response) {
                    var accountDataTMP = {
                      name: tweets.name,
                      id: tweets.screen_name,
                      icon: tweets.profile_image_url,
                      color: tweets.profile_link_color
                    }
                    setTimeout(function() {
                      mainWindow.webContents.send('accountData', accountDataTMP)
                    }, 2000)

                  })
                }
              }

              var Follist = JSON.parse(fs.readFileSync(__dirname + '/lib/datas/followList-' + nativeID + '.json'))
              var FlistJ = Follist.follows.join(',')



              //Stream接続
              //Follist.follows
              client.stream('statuses/filter', {follow: FlistJ}, function(stream) {
                stream.on('data', function(event) {
                  var imgBox = null
                  var videoBox = null

                  // media追加
                  if(event.extended_entities !== undefined) {
                    for(var i = 0; event.extended_entities.media.length > i; i++) {
                      if(event.extended_entities.media[i].video_info !== undefined) {
                        var VIDEOBOX = []
                        for(var n = 0; event.extended_entities.media[i].video_info.variants.length > n; n++) {
                          if(event.extended_entities.media[i].video_info.variants[n].bitrate !== undefined) {
                            VIDEOBOX.push(event.extended_entities.media[i].video_info.variants[n].bitrate)
                          }
                        }
                        var videoBox = event.extended_entities.media[i].video_info.variants[VIDEOBOX.indexOf(Math.max.apply(null, VIDEOBOX))].url
                      } else {
                        //画像だった場合
                        var imgBox = event.extended_entities.media
                      }
                    }
                  }



                  var DTTT = {
                    id: event.id_str,
                    img: imgBox,
                    video: videoBox,
                    ev: event
                  }
                    mainWindow.webContents.send('stream', DTTT)

                })

                stream.on('error', function(error) {
                  throw error
                })
              })

              // IPC通信@受信
              ipc.on('ipcTwitter', function(event, msg) {
                var Tid = String(msg.id)
                console.log(Tid)
                switch(msg.status) {
                  case 'favorite':
                    //ふぁぼ
                    client.post('favorites/create', {id: Tid},  function(error, tweet, response) {
                      if(error) {
                        mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error.message + '(' + error.code + ')')
                      } else {
                        mainWindow.webContents.send('ipcTwitter-reply', 'いいねしました: ' + tweet.text)
                      }
                    })
                    break
                  case 'retweet':
                    //RT
                    client.post('statuses/retweet', {id: Tid},  function(error, tweet, response) {
                      if(error) {
                        mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error.message + '(' + error.code + ')')
                      } else {
                        mainWindow.webContents.send('ipcTwitter-reply', 'RTしました: ' + tweet.text)
                      }
                    })
                    break
                  case 'favrt':
                    //ふぁぼりつ
                    client.post('favorites/create', {id: Tid},  function(error, tweet, response) {
                      if(error) {
                        mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error.message + '(' + error.code + ')')
                      } else {
                        mainWindow.webContents.send('ipcTwitter-reply', 'いいねしました: ' + tweet.text)
                      }
                    })
                    client.post('statuses/retweet', {id: Tid},  function(error, tweet, response) {
                      if(error) {
                        mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error.message + '(' + error.code + ')')
                      } else {
                        mainWindow.webContents.send('ipcTwitter-reply', 'RTしました: ' + tweet.text)
                      }
                    })
                      mainWindow.webContents.send('ipcTwitter-reply', 'ふぁぼりつしました')
                    break
                }
              })


            }, 2000)
          }

      }

      loadingWindow.on('closed', function() {
          loadingWindow = null
      })
    })

})



// menu
var template = [
  {
    label: '設定',
    submenu: [
      {role: '更新確認'},
      {role: 'アカウント追加'},
      {role: 'About'}
    ]
  } , { label: 'Toggle DevTools', accelerator: 'Alt+Command+I', click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); } }
]

var menu = Menu.buildFromTemplate(template)

// DiscordRPC

/*
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
*/

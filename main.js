'use strict'

const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const dialog = electron.dialog
const ipc = electron.ipcMain
const Menu = electron.Menu
const Tray = electron.Tray
const clipboard = electron.clipboard
const Notification = electron.Notification

const https = require('https')
const fs = require('fs')
const Twitter = require('twitter')
const twitterOauth = require('electron-oauth-twitter')
const notifier = require('node-notifier')
const __config = JSON.parse(fs.readFileSync(__dirname + '/lib/settings/config.conf'))

var mainWindow = null
var loadingWindow = null
var fastTweet = null
var notificationWindow = null
var tray = null

function isExist(type, name) {
  if(type === 'file') {
    try {
      fs.statSync(name)
      return true
    } catch(err) {
      if(err.code === 'ENOENT') return false
    }
  } else {
    try {
      fs.readDirSync(name)
      return true
    } catch(err) {
      if(err.code === 'ENOENT') return false
    }
  }
}

function alliveSystem(type, name, msg) {
  if(isExist(type, __dirname + name) === false) {
    if(type === 'dir') {
      fs.mkdirSync(__dirname + name)
    } else {
      fs.writeFileSync(__dirname + name, msg)
    }
  }
}

alliveSystem('dir', '/lib/tokens')
alliveSystem('dir', '/lib/datas')


var lvs = [
    50,150,300,500,750, //5
    1100,1550,2100,2750,3500, //10
    4400,5450,6650,8000,9500, //15
    11200,13100,15200,17500,20000, //20
    22750,25750,29000,32500,36250, //25
    40300,44650,49300,54250,59500, //30
    65100,71050,77350,84000,91000, //35
    98400,106200,114400,123000,132000, //40
    141450,151350,161700,172500,183750, //45
    195500,207750,220500,233750,247500, //50
    261800,276650,292050,308000,324500, //55
    341600,359300,377600,396500,416000, //60
    436150,456950,478400,500500,523250, //65
    546700,570850,595700,621250,647500, //70
    674500,702250,730750,760000,790000, //75
    820800,852400,884800,918000,952000, //80
    986850,1022550,1059100,1096500,1134750, //85
    1173900,1213950,1254900,1296750,1339500, //90
    1383200,1427850,1473450,1520000,1567500, //95
    1616000,1665500,1716000,1767500,1820000, //100
    1873550,1928150,1983800,2040500,2098250, //105
    2157100,2217050,2278100,2340250,2403500, //110
    2467900,2533450,2600150,2668000,2737000, //115
    2807200,2878600,2951200,3025000,3100000 //120
]

function levelSystem(type, id) {
    var accountNAME = fs.readFileSync(__dirname + '/lib/datas/accountData-' + id + '.json')
    var cExp = fs.readFileSync(__dirname + '/lib/datas/lvData-' + id + '.json')
    if(type === 'tweet') {
      var min = 30
      var max = 50
      var nExp = Math.floor( Math.random() * (max + 1 - min) ) + min
      var lvMes = 'ツイートをした！'
    } else if(type === 'favrt') {
      var min = 20
      var max = 60
      var nExp = Math.floor( Math.random() * (max + 1 - min) ) + min
      var lvMes = 'ふぁぼりつをした！'
    } else if(type === 'favorite') {
      var min = 10
      var max = 30
      var nExp = Math.floor( Math.random() * (max + 1 - min) ) + min
      var lvMes = 'いいねをした！'
    } else if(type === 'retweet') {
      var min = 10
      var max = 40
      var nExp = Math.floor( Math.random() * (max + 1 - min) ) + min
      var lvMes = 'RTをした！'
    } else {
      var min = 20
      var max = 40
      var nExp = Math.floor( Math.random() * (max + 1 - min) ) + min
      var lvMes = 'TL垂れ流しボーナス！'
    }

    for(var i = 0; lvs.length > i; i++) {
      if(cExp < lvs[i]) {
        var nowdLv = i + 1
        break
      }
    }

    var nowExp = parseInt(cExp) + parseInt(nExp)
    fs.writeFileSync(__dirname + '/lib/datas/lvData-' + id + '.json', nowExp)
    for(var i = 0; lvs.length > i; i++) {
      if(nowExp < lvs[i]) {
        var nowLv = i + 1
        break
      }
    }

    if(nowLv > nowdLv) {
      var lvUpMes = "<div class='yellow-text'>ランクアップ！</div>"
    } else {
      var lvUpMes = null
    }

    var leaveExp = lvs[nowLv - 1] - lvs[nowLv - 2]
    var nowExpEdi = nowExp - lvs[nowLv - 2]
    var percentage = Math.round((nowExpEdi / leaveExp) * 100)
    var matome = {
      name: accountNAME,
      nowExp: nowExpEdi,
      nowLv: nowLv,
      leaveExp: leaveExp,
      percentage: percentage,
      message: lvMes,
      getExp: nExp,
      lvUpMes: lvUpMes
    }

    mainWindow.webContents.send('twiLV', matome)
}

var appVersion = JSON.parse(fs.readFileSync(__dirname + '/version.json'))

var logIn = null

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin')
      app.quit()
})

app.on('ready', function() {
    // CreateTray
    tray = new Tray(__dirname + '/lib/assets/twihigh.ico')
    const contextMenu = Menu.buildFromTemplate([
      {label: 'TwiHighを開く', click: function() {mainWindow.show()}},
      {label: 'FastTweet', click: function() {fastTweet.show()}},
      {label: '再起動', click: function() {app.relaunch();app.quit()}},
      {label: '終了', click: function() {app.quit()}}
    ])
    tray.setToolTip('TwiHigh Ver.' + appVersion.version)
    tray.setContextMenu(contextMenu)

    // LoadingWindow
    loadingWindow = new BrowserWindow({width: 250, height: 350, movable: false, frame: false, icon: __dirname + '/lib/assets/twihigh.ico'})
    loadingWindow.loadURL('file://' + __dirname + '/lib/html/loading.html')

    loadingWindow.webContents.on('did-finish-load', () => {
      loadingWindow.show()
      loadingWindow.webContents.send('version', appVersion.version)

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
                      loadingWindow.webContents.send('log', 'アップデート確認完了...<br>アップデートがあります<br>' + appVersion.version + ' -> ' + res.version + '<br>更新内容: ' + res.message)
                  }
              } else {
                // アプデが存在しなかった場合
                loadingWindow.webContents.send('log', 'アップデート確認完了...アップデート無し (' + res.version + ')')
              }


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
                      client.get('friends/ids', {user_id: tweets.id, count: 700}, function(error2, tweets2, response2) {
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

                      // メインウインドウ起動
                      mainWindow = new BrowserWindow({width: 1080, height: 720, show: false, backgroundColor: '#4FC3F7', icon: __dirname + '/lib/assets/twihigh.ico'})
                      mainWindow.loadURL('file://' + __dirname + '/lib/html/index.html')
                      Menu.setApplicationMenu(menu)
                      mainWindow.once('ready-to-show', () => {
                        mainWindow.show()
                        loadingWindow.close()
                      })

                      // FastTweetウインドウ起動準備
                      fastTweet = new BrowserWindow({width: 350, height: 310, frame: false, transparent: true, show: false, resizable: false, icon: __dirname + '/lib/assets/twihigh.ico'})
                      fastTweet.loadURL('file://' + __dirname + '/lib/html/fasttweet.html')

                      // Notificationウインドウ起動準備
                    //  var NotificationWidth = window.parent.screen.width - 100
                    //  var NotificationHeight = window.parent.screen.height - 100
                      notificationWindow = new BrowserWindow({width: 400, height: 150, x: 20, y: 20, frame: false, transparent: true, show: false, resizable: false, alwaysOnTop: true, skipTaskbar: true})
                      notificationWindow.loadURL('file://' + __dirname + '/lib/html/notification.html')
                      notificationWindow.webContents.on('did-finish-load', () => {
                        notificationWindow.show()
                        setTimeout(function() {
                          notificationWindow.hide()
                        }, 3000)
                      })

                      // ログイン指定。本来はconfigから取得！
                      var logIn = twitterTokensAllive[0]
                      var loginedAccount = JSON.parse(fs.readFileSync( __dirname + '/lib/tokens/' + logIn))

                      var nativeID = logIn.replace('.json', '')

                      // LvConf生成
                      alliveSystem('file', '/lib/datas/lvData-' + nativeID + '.json', 0)
                      alliveSystem('file', '/lib/datas/accountData-' + nativeID + '.json', '')

                      // Lv初期生成
                      var nowExp = fs.readFileSync(__dirname + '/lib/datas/lvData-' + nativeID + '.json')

                      for(var i = 0; lvs.length > i; i++) {
                        if(nowExp < lvs[i]) {
                          var nowLv = i + 1
                          break
                        }
                      }

                      var leaveExp = lvs[nowLv - 1] - lvs[nowLv - 2]
                      var nowExpEdi = nowExp - lvs[nowLv - 2]
                      var percentage = Math.round((nowExpEdi / leaveExp) * 100)

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
                          client.get('friends/ids', {user_id: nativeID}, function(error2, tweets2, response2) {
                            var followsList = {
                              date: Hours + '/' + Minutes,
                              follows: tweets2.ids
                            }

                            fs.writeFileSync(__dirname + '/lib/datas/followList-' + nativeID + '.json', JSON.stringify(followsList, null, ''))
                          })
                          client.get('account/verify_credentials', function(error, tweets, response) {
                            fs.writeFileSync(__dirname + '/lib/datas/accountData-' + nativeID + '.json', tweets.name)
                            var accountDataTMP = {
                              name: tweets.name,
                              id: tweets.screen_name,
                              icon: tweets.profile_image_url,
                              color: tweets.profile_link_color,
                              nowExp: nowExpEdi,
                              nowLv: nowLv,
                              leaveExp: leaveExp,
                              percentage: percentage
                            }
                            setTimeout(function() {
                              mainWindow.webContents.send('accountData', accountDataTMP)
                            }, 2000)
                          })
                        }
                      }

                      // ReplyData更新
                      client.get('statuses/mentions_timeline', {count: 1}, function(error, tweets, response) {
                        fs.writeFileSync(__dirname + '/lib/datas/mentionsData-' + nativeID + '.json', tweets[0].id_str)
                      })

                      // ReplyData受け取り
                      setInterval(function() {
                        var lastReply = fs.readFileSync(__dirname + '/lib/datas/mentionsData-' + nativeID + '.json')
                        client.get('statuses/mentions_timeline', {since_id: lastReply}, function(error, tweets, response) {
                          if(tweets.length !== 0) {
                            fs.writeFileSync(__dirname + '/lib/datas/mentionsData-' + nativeID + '.json', tweets[tweets.length - 1].id_str)
                            for(var i = 0; tweets.length > i; i++) {
                              var twiContents = tweets[tweets.length - 1 - i]
                              var notificationContents = {
                                head: twiContents.user.name + '(@' + twiContents.user.screen_name + ') さんからリプライが届いています' ,
                                body: twiContents.text
                              }
                              notificationWindow.show()
                              notificationWindow.webContents.send('notification-child', notificationContents)
                              mainWindow.webContents.send('getReply', twiContents)
                              setTimeout(function() {
                                notificationWindow.hide()
                              }, 10000)
                            }
                          }
                        })
                      }, 15000)

                        var Follist = JSON.parse(fs.readFileSync(__dirname + '/lib/datas/followList-' + nativeID + '.json'))
                        var flisBox = []
                        if(Follist.follows.length > 700) {
                          var upperLength = 700
                        } else {
                          var upperLength = Follist.follows.length
                        }
                        for(var i = 0; upperLength > i; i++) {
                          flisBox.push(Follist.follows[i])
                        }
                        var FlistJ = flisBox.join(',')

                        //Stream接続
                        //Follist.follows
                        client.stream('statuses/filter', {follow: FlistJ}, function(stream) {
                          stream.on('data', function(event) {
                            if(Follist.follows.indexOf(event.user.id) !== -1) {
                              if(Math.floor(Math.random() * 100) + 1 > 95) {
                                levelSystem('bounus', nativeID)
                              }
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
                              }
                            })

                          stream.on('error', function(error) {
                            throw error
                          })
                        })


                      // IPC通信@tweet
                      ipc.on('ipcTwitterTweet', function(event, data) {
                        levelSystem('tweet', nativeID)
                        var tweetText = data.text
                        if(data.media !== null) {
                          //Media追加処理
                        }

                        client.post('statuses/update', {status: tweetText}, function(error, tweet, response) {
                          if(error) {
                            mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error[0].message + '(' + error[0].code + ')')
                            fastTweet.webContents.send('ipcTwitter-reply-child', 'エラー: ' + error[0].message + '(' + error[0].code + ')')
                          } else {
                            mainWindow.webContents.send('ipcTwitter-reply', 'ツイートしました！')
                            fastTweet.webContents.send('ipcTwitter-reply-child', 'ツイートしました！')
                          }
                        })
                      })

                      // IPC通信@システム系通信
                      ipc.on('systemCtl', function(event, data) {
                        if(data === 'hideWindow') {
                          mainWindow.hide()
                        }
                        if(data === 'closeFastWindow') {
                          fastTweet.hide()
                        }
                        if(data === 'onTopFastWindow') {
                          if(fastTweet.isAlwaysOnTop() === false) {
                            fastTweet.setAlwaysOnTop(true)
                          } else {
                            fastTweet.setAlwaysOnTop(false)
                          }
                        }
                      })

                      // IPC通信@ふぁぼりつ受信
                      ipc.on('ipcTwitter', function(event, msg) {

                        var Tid = String(msg.id)
                        console.log(Tid)
                        switch(msg.status) {
                          case 'favorite':
                            //ふぁぼ
                            levelSystem('favorite', nativeID)
                            client.post('favorites/create', {id: Tid},  function(error, tweet, response) {
                              if(error) {
                                mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error[0].message + '(' + error[0].code + ')')
                              } else {
                                mainWindow.webContents.send('ipcTwitter-reply', 'いいねしました: ' + tweet.text)
                              }
                            })
                            break
                          case 'retweet':
                            //RT
                            levelSystem('retweet', nativeID)
                            client.post('statuses/retweet', {id: Tid},  function(error, tweet, response) {
                              if(error) {
                                mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error[0].message + '(' + error[0].code + ')')
                              } else {
                                mainWindow.webContents.send('ipcTwitter-reply', 'RTしました: ' + tweet.text)
                              }
                            })
                            break
                          case 'favrt':
                            //ふぁぼりつ
                            levelSystem('favrt', nativeID)
                            client.post('favorites/create', {id: Tid},  function(error, tweet, response) {
                              if(error) {
                                mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error[0].message + '(' + error[0].code + ')')
                              } else {
                                mainWindow.webContents.send('ipcTwitter-reply', 'いいねしました: ' + tweet.text)
                              }
                            })
                            client.post('statuses/retweet', {id: Tid},  function(error, tweet, response) {
                              if(error) {
                                mainWindow.webContents.send('ipcTwitter-reply', 'エラー: ' + error[0].message + '(' + error[0].code + ')')
                              } else {
                                mainWindow.webContents.send('ipcTwitter-reply', 'RTしました: ' + tweet.text)
                              }
                            })
                              mainWindow.webContents.send('ipcTwitter-reply', 'ふぁぼりつしました')
                            break
                        }
                      })

                  }
              }
          })
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
  } , {
    label: 'Toggle DevTools',
    accelerator: 'Ctrl+Shift+I',
    click: function() {
      BrowserWindow.getFocusedWindow().toggleDevTools();
    }
  }
]

var menu = Menu.buildFromTemplate(template)

// DiscordRPC
/*
const client = require('discord-rich-presence')('487281125744574474')

var date = new Date()
var a = date.getTime()
var b = Math.floor(a / 1000)

client.updatePresence({
    state: '起動から',
    details: 'TwitterClient',
    largeImageKey: 'icon',
    largeImageText: 'Ver.' + appVersion.version,
    startTimestamp: b,
    instance: true,
})
*/

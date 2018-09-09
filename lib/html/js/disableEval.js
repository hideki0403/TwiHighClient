window.eval = global.eval = function () {
    throw new Error('TwiHighは攻撃者からユーザーを保護するためにevalの使用を許可していません。')
}

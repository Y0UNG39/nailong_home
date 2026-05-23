export function toast(title: string, icon: 'success' | 'error' | 'none' = 'none', duration = 1500) {
  uni.showToast({ title, icon, duration, mask: false })
}

export function success(title: string) {
  uni.showToast({ title, icon: 'success', duration: 1500 })
}

export function error(title: string) {
  uni.showToast({ title, icon: 'error', duration: 2000 })
}

export function loading(title = '加载中...') {
  uni.showLoading({ title, mask: true })
}

export function hide() {
  uni.hideLoading()
}

export function confirm(content: string, onOk: () => void, title = '提示') {
  uni.showModal({
    title,
    content,
    confirmText: '确定',
    cancelText: '取消',
    confirmColor: '#FFB800',
    success(res) {
      if (res.confirm) onOk()
    }
  })
}

export function alert(content: string, onOk?: () => void, title = '提示') {
  uni.showModal({
    title,
    content,
    showCancel: false,
    confirmText: '知道了',
    confirmColor: '#FFB800',
    success() {
      onOk?.()
    }
  })
}

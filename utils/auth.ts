import { useAppStore } from '@/store/index'
import * as notify from './notify'

/** 封装 wx.cloud.callFunction */
export function callFunction(name: string, data: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success(res: any) {
        if (res.result?.success === false) {
          notify.error(res.result.error || '操作失败')
          reject(new Error(res.result.error))
          return
        }
        resolve(res.result)
      },
      fail(err: any) {
        notify.error('网络异常，请重试')
        reject(err)
      }
    })
  })
}

export async function login(nickname = '', avatar = '') {
  const result = await callFunction('login', { nickname, avatar })
  useAppStore().setLoginData(result)
  return result
}

export async function bindCouple(coupleId: string) {
  const result = await callFunction('bindCouple', { coupleId })
  if (result.success) useAppStore().setCouple(coupleId)
  return result
}

export function getUserInfo() {
  const store = useAppStore()
  return { openid: store.openid, user: store.user, coupleId: store.coupleId, isNew: store.isNew, isPaired: store.isPaired }
}

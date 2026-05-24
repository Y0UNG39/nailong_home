import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const openid = ref<string | null>(null)
  const coupleId = ref<string | null>(null)
  const inviteCode = ref<string>('')
  const user = ref<any>(null)
  const isNew = ref(false)
  const balance = ref(0)
  const partner = ref<any>(null)

  const isPaired = computed(() => !!coupleId.value)
  const loggedIn = computed(() => !!openid.value)

  function setLoginData(data: { openid: string; isNew: boolean; user: any }) {
    openid.value = data.openid
    isNew.value = data.isNew
    user.value = data.user
    if (data.user?.coupleId) {
      coupleId.value = data.user.coupleId
    }
  }

  function setCouple(id: string) {
    coupleId.value = id
    if (user.value) {
      user.value.coupleId = id
    }
  }

  function setPartner(p: any) {
    partner.value = p
  }

  function updateUser(data: Record<string, any>) {
    if (user.value) {
      user.value = { ...user.value, ...data }
    }
  }

  function setBalance(b: number) {
    balance.value = b
  }

  function addBalance(amount: number) {
    balance.value += amount
  }

  function setInviteCode(code: string) {
    inviteCode.value = code
    uni.setStorageSync('couple_invite_code', code)
  }

  function loadInviteCodeFromStorage() {
    try {
      const saved = uni.getStorageSync('couple_invite_code')
      if (saved) inviteCode.value = saved
    } catch {}
  }

  function logout() {
    openid.value = null
    coupleId.value = null
    inviteCode.value = ''
    user.value = null
    partner.value = null
    balance.value = 0
    isNew.value = false
  }

  return {
    openid, coupleId, inviteCode, user, isNew, balance, partner,
    isPaired, loggedIn,
    setLoginData, setCouple, setInviteCode, loadInviteCodeFromStorage, setPartner, updateUser, setBalance, addBalance, logout
  }
})

import { callFunction } from './auth'

export async function fetchBalance(coupleId: string) {
  const result = await callFunction('getBalance', { coupleId })
  return result
}

export async function addCoins(coupleId: string, amount: number, type: string, description = '') {
  return callFunction('coinChange', { coupleId, amount, type, description })
}

export async function spendCoins(coupleId: string, amount: number, type: string, description = '') {
  return addCoins(coupleId, -amount, type, description)
}

export async function getLogs(coupleId: string, limit = 20) {
  return callFunction('getBalance', { coupleId, limit })
}

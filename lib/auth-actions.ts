"use server"

import { cookies } from "next/headers"

export async function verifyLogin(username: string, password: string) {
  const correctUser = process.env.LOGIN_USER
  const correctPass = process.env.LOGIN_PASS

  if (username === correctUser && password === correctPass) {
    // In a real app, you would set a secure cookie/session here
    // For this simple implementation, we'll return success
    return { success: true }
  }

  return { success: false, message: "Usuário ou senha incorretos" }
}

export async function checkAuth() {
  // This could check for a cookie
  return false 
}

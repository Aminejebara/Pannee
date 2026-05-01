import { useState } from 'react'
import { userService } from '../services/user/userService'

export const useUser = () => {
  const [loading, setLoading] = useState(false)

  const getProfile = async () => {
    setLoading(true)
    try {
      const data = await userService.getProfile()
      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally { setLoading(false) }
  }

  const getHomeData = async (lat, lng, radius = 10) => {
    setLoading(true)
    try {
      const data = await userService.getHomeData(lat, lng, radius)
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally { setLoading(false) }
  }

  return { loading, getProfile, getHomeData }
}
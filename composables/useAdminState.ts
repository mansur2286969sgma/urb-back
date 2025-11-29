// composables/useAdminState.ts
export const useAdminState = () => {
  const isAdmin = ref(false)
  const adminUser = ref<any>(null)
  const isLoading = ref(false)

  const API_BASE = 'https://urb-back.onrender.com/api'

  // Вход администратора
  const adminLogin = async (credentials: { login: string; password: string }) => {
    try {
      isLoading.value = true
      
      // Для демонстрации - имитация запроса к бэкенду
      // В реальном приложении раскомментируйте код ниже
      
      // const response = await $fetch(`${API_BASE}/admin/login`, {
      //   method: 'POST',
      //   body: credentials
      // })

      // if (response.success) {
      //   isAdmin.value = true
      //   adminUser.value = response.user
        
      //   // Сохраняем токен в localStorage
      //   if (process.client) {
      //     localStorage.setItem('adminToken', response.token)
      //     localStorage.setItem('adminUser', JSON.stringify(response.user))
      //   }
        
      //   return { success: true }
      // } else {
      //   return { success: false, error: response.error }
      // }

      // Демо-версия - простая проверка
      if (credentials.login === 'admin' && credentials.password === 'admin123') {
        isAdmin.value = true
        adminUser.value = {
          id: 1,
          login: 'admin',
          role: 'admin',
          name: 'Администратор'
        }
        
        // Сохраняем в localStorage для демо
        if (process.client) {
          localStorage.setItem('isAdmin', 'true')
          localStorage.setItem('adminUser', JSON.stringify(adminUser.value))
        }
        
        return { success: true }
      } else {
        return { success: false, error: 'Неверный логин или пароль' }
      }
    } catch (error: any) {
      console.error('Ошибка входа:', error)
      return { 
        success: false, 
        error: error.data?.error || 'Ошибка соединения с сервером' 
      }
    } finally {
      isLoading.value = false
    }
  }

  // Проверка авторизации администратора
  const checkAdminAuth = async () => {
    try {
      if (process.client) {
        // Для демо - проверяем простой флаг
        const savedAdmin = localStorage.getItem('isAdmin')
        
        if (savedAdmin === 'true') {
          isAdmin.value = true
          const savedUser = localStorage.getItem('adminUser')
          if (savedUser) {
            adminUser.value = JSON.parse(savedUser)
          }
        }

        // В реальном приложении используйте этот код:
        // const token = localStorage.getItem('adminToken')
        
        // if (!token) {
        //   isAdmin.value = false
        //   adminUser.value = null
        //   return
        // }

        // const response = await $fetch(`${API_BASE}/admin/verify`, {
        //   headers: {
        //     'Authorization': `Bearer ${token}`
        //   }
        // })

        // if (response.success) {
        //   isAdmin.value = true
        //   adminUser.value = response.user
        // } else {
        //   // Токен невалидный, очищаем
        //   logout()
        // }
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error)
      logout()
    }
  }

  // Выход администратора
  const logout = () => {
    isAdmin.value = false
    adminUser.value = null
    
    if (process.client) {
      localStorage.removeItem('isAdmin')
      localStorage.removeItem('adminUser')
      localStorage.removeItem('adminToken')
    }
  }

  // Проверяем авторизацию при инициализации
  onMounted(() => {
    checkAdminAuth()
  })

  return {
    isAdmin: readonly(isAdmin),
    adminUser: readonly(adminUser),
    isLoading: readonly(isLoading),
    adminLogin,
    logout,
    checkAdminAuth
  }
}
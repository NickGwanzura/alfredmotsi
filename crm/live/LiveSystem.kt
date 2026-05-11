
package com.splashair.crm.live

data class UserSession(val uid:String, val role:String)

object AuthService {
  fun loginEmail(email:String,password:String): Boolean = true
  fun loginPhone(phone:String,otp:String): Boolean = true
}

object SyncService {
  fun syncJobs(): String = "Jobs synced"
  fun syncCustomers(): String = "Customers synced"
}

object GpsService {
  fun updateLocation(lat:Double, lng:Double): String = "Location updated"
}

object UploadService {
  fun uploadPhoto(path:String): String = "Uploaded $path"
}

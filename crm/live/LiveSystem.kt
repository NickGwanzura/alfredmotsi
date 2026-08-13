
package com.splashair.crm.live

data class UserSession(val uid:String, val role:String)

object AuthService {
  // Legacy mobile prototype: authentication is implemented by the CRM's
  // server-side Auth.js flow. Never treat these placeholder calls as success.
  fun loginEmail(email:String,password:String): Boolean = false
  fun loginPhone(phone:String,otp:String): Boolean = false
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

package com.villalbilla.fantasytorch

import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FantasyTorchModule : Module() {
  private val handler = Handler(Looper.getMainLooper())
  private var activeTorch: Pair<CameraManager, String>? = null
  private var lastStart: Long? = null

  override fun definition() = ModuleDefinition {
    Name("FantasyTorch")
    Function("pulse") { handler.post { pulse() }; Unit }
    Function("stop") { handler.post { stop() }; Unit }
    OnActivityEntersBackground { handler.post { stop() } }
    OnDestroy { handler.post { stop() } }
  }

  private fun pulse() {
    val now = SystemClock.elapsedRealtime()
    if (lastStart?.let { now - it < 1400 } == true) return
    val activity = appContext.currentActivity ?: return
    if (activity.isFinishing || activity.isDestroyed) return
    val manager = activity.getSystemService(CameraManager::class.java) ?: return
    val rearFlash = runCatching {
      manager.cameraIdList.firstOrNull { id ->
        val camera = manager.getCameraCharacteristics(id)
        camera.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true &&
          camera.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
      }
    }.getOrNull() ?: return
    stop()
    if (!setTorch(manager, rearFlash, true)) return
    lastStart = now
    activeTorch = manager to rearFlash
    for ((delay, enabled) in listOf(65L to false, 165L to true, 230L to false, 330L to true)) {
      handler.postDelayed({
        if (!setTorch(manager, rearFlash, enabled)) stop()
      }, delay)
    }
    handler.postDelayed({ stop() }, 395L)
  }

  private fun setTorch(manager: CameraManager, id: String, enabled: Boolean): Boolean =
    runCatching { manager.setTorchMode(id, enabled) }.isSuccess

  private fun stop() {
    handler.removeCallbacksAndMessages(null)
    activeTorch?.let { (manager, id) -> setTorch(manager, id, false) }
    activeTorch = null
  }
}

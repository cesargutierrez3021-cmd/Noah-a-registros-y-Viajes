@file:Suppress("UseKtx", "SetTextI18n", "ObsoleteSdkInt")

package com.noah.conductor.atlas.alarma

import android.app.KeyguardManager
import android.content.Context
import android.graphics.Color
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.graphics.drawable.GradientDrawable
import androidx.appcompat.app.AppCompatActivity
import com.noah.conductor.atlas.R

/**
 * La alarma a pantalla completa. Se abre sola incluso con el celular
 * bloqueado (showWhenLocked + turnScreenOn en el manifiesto), suena y
 * vibra hasta que el conductor la descarta.
 */
class AlarmaActivity : AppCompatActivity() {

    private var vibrator: Vibrator? = null
    private var voz: MediaPlayer? = null
    private val repetidor = Handler(Looper.getMainLooper())
    private var alarmaDescartada = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            (getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        val titulo = intent.getStringExtra("titulo") ?: "MIA"
        val detalle = intent.getStringExtra("detalle") ?: ""
        val vozId = intent.getStringExtra("vozId") ?: "voz_1"
        val tipo = intent.getStringExtra("tipo") ?: "recordatorio"

        setContentView(construirVista(titulo, detalle, tipo))
        sonarYVibrar(vozId)
    }

    private fun construirVista(titulo: String, detalle: String, tipo: String): LinearLayout {
        val raiz = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#050814"))
            setPadding(dp(24), dp(24), dp(24), dp(24))
        }

        val kicker = TextView(this).apply {
            text = "MIA  ·  AVISO"
            setTextColor(Color.parseColor("#67E8F9"))
            textSize = 12f
            letterSpacing = 0.3f
            gravity = Gravity.CENTER
        }
        val personaje = ImageView(this).apply {
            setImageResource(R.mipmap.ic_launcher_round)
            scaleType = ImageView.ScaleType.CENTER_CROP
            contentDescription = "Icono de MIA"
            layoutParams = LinearLayout.LayoutParams(dp(132), dp(132)).apply { gravity = Gravity.CENTER; bottomMargin = dp(12) }
        }
        ObjectAnimator.ofFloat(personaje, "scaleX", 0.97f, 1.03f).apply { duration = 1100; repeatMode = ValueAnimator.REVERSE; repeatCount = ValueAnimator.INFINITE }.start()
        ObjectAnimator.ofFloat(personaje, "scaleY", 0.97f, 1.03f).apply { duration = 1100; repeatMode = ValueAnimator.REVERSE; repeatCount = ValueAnimator.INFINITE }.start()
        val tituloVista = TextView(this).apply {
            text = titulo
            setTextColor(Color.parseColor("#F8FAFC"))
            textSize = 25f
            gravity = Gravity.CENTER
            setPadding(0, dp(8), 0, dp(10))
        }
        val detalleVista = TextView(this).apply {
            text = detalle
            setTextColor(Color.parseColor("#C7D2FE"))
            textSize = 15f
            gravity = Gravity.CENTER
            setPadding(dp(16), dp(14), dp(16), dp(14))
            background = GradientDrawable().apply { cornerRadius = dp(18).toFloat(); setColor(Color.argb(70, 30, 41, 75)); setStroke(dp(1), Color.argb(130, 103, 232, 249)) }
        }
        val boton = Button(this).apply {
            text = "ENTENDIDO"
            setTextColor(Color.parseColor("#04111F"))
            background = GradientDrawable().apply { cornerRadius = dp(28).toFloat(); setColor(Color.parseColor("#67E8F9")) }
            setPadding(dp(24), dp(16), dp(24), dp(16))
            minHeight = dp(54)
            setOnClickListener { alarmaDescartada = true; finish() }
        }

        raiz.addView(kicker)
        raiz.addView(personaje)
        raiz.addView(tituloVista)
        raiz.addView(detalleVista, LinearLayout.LayoutParams(-1, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(4); bottomMargin = dp(24) })
        raiz.addView(boton)
        return raiz
    }

    private fun sonarYVibrar(vozId: String) {
        if (vozId == "sin_voz") return
        runCatching {
            val recurso = when (vozId) { "voz_2" -> R.raw.voz_2; "voz_3" -> R.raw.voz_3; "voz_4" -> R.raw.voz_4; "voz_5" -> R.raw.voz_5; else -> R.raw.voz_1 }
            voz = MediaPlayer.create(this, recurso)
            voz?.setOnCompletionListener { reproductor ->
                reproductor.release()
                voz = null
                if (!alarmaDescartada && !isFinishing) {
                    repetidor.postDelayed({ if (!alarmaDescartada && !isFinishing) sonarYVoz(vozId) }, 2000)
                }
            }
            voz?.start()
        }
        runCatching {
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            val patron = longArrayOf(0, 500, 400)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(patron, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(patron, 0)
            }
        }
    }

    override fun onDestroy() {
        alarmaDescartada = true
        repetidor.removeCallbacksAndMessages(null)
        super.onDestroy()
        runCatching { voz?.stop() }
        runCatching { voz?.release() }
        vibrator?.cancel()
    }

    private fun sonarYVoz(vozId: String) {
        if (vozId == "sin_voz" || alarmaDescartada || isFinishing) return
        runCatching {
            val recurso = when (vozId) { "voz_2" -> R.raw.voz_2; "voz_3" -> R.raw.voz_3; "voz_4" -> R.raw.voz_4; "voz_5" -> R.raw.voz_5; else -> R.raw.voz_1 }
            voz = MediaPlayer.create(this, recurso)
            voz?.setOnCompletionListener { reproductor ->
                reproductor.release(); voz = null
                if (!alarmaDescartada && !isFinishing) repetidor.postDelayed({ sonarYVoz(vozId) }, 2000)
            }
            voz?.start()
        }
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
}

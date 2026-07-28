'use client'

import * as React from 'react'

/**
 * useVoiceInput — records audio from the microphone, sends it to /api/asr
 * for transcription, and returns the transcribed text.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [recording, setRecording] = React.useState(false)
  const [transcribing, setTranscribing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const streamRef = React.useRef<MediaStream | null>(null)

  const startRecording = React.useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1]
          setTranscribing(true)
          try {
            const res = await fetch('/api/asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64 }),
            })
            const data = await res.json()
            if (res.ok && data.text) {
              onTranscript(data.text)
            } else {
              setError(data?.error || 'Transcription failed')
            }
          } catch (e: any) {
            setError(e?.message || 'Network error during transcription')
          } finally {
            setTranscribing(false)
          }
        }
        reader.readAsDataURL(blob)
        // Stop all tracks
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
    } catch (e: any) {
      setError(e?.message || 'Could not access microphone')
    }
  }, [onTranscript])

  const stopRecording = React.useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }, [])

  const toggle = React.useCallback(() => {
    if (recording) stopRecording()
    else startRecording()
  }, [recording, startRecording, stopRecording])

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { recording, transcribing, error, startRecording, stopRecording, toggle }
}

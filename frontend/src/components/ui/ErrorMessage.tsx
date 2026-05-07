interface ErrorMessageProps {
  message: string
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-64 gap-3">
      <span className="text-3xl">⚠️</span>
      <p className="text-sm text-red-500 font-medium">{message}</p>
    </div>
  )
}

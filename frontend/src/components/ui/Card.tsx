import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl shadow-md p-6
        ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
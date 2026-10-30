import React, { useState, useEffect } from 'react'

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false)

  // Jalankan pemantauan posisi scroll layar
  useEffect(() => {
    const toggleVisibility = () => {
      // Tampilkan tombol jika scroll ke bawah lebih dari 400px
      if (window.scrollY > 400) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)

    // Bersihkan event listener saat komponen dilepas
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  // Fungsi untuk memicu scroll mulus ke atas
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth', // Efek animasi scroll mulus bawaan browser
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed lg:bottom-10 bottom-20 right-10 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform flex items-center justify-center ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-75 pointer-events-none'
        }`}
        aria-label="Scroll ke atas"
      >
        {/* Ikon Panah Ke Atas SVG Murni */}
        <svg className="w-6 h-6 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
          />
        </svg>
      </button>
    </>
  )
}

export default ScrollToTopButton

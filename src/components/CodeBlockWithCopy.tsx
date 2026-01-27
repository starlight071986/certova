'use client'

import { useEffect } from 'react'

export default function CodeBlockWithCopy() {
  useEffect(() => {
    const addCopyButtons = () => {
      // Find all code blocks in lesson content
      const codeBlocks = document.querySelectorAll('.lesson-content pre')

      codeBlocks.forEach((block) => {
        // Skip if already has copy button
        if (block.querySelector('.code-copy-button')) {
          return
        }

      // Create copy button
      const button = document.createElement('button')
      button.className = 'code-copy-button'
      button.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-width="2"/>
        </svg>
      `

      button.onclick = async () => {
        const code = block.querySelector('code')
        if (!code) return

        const text = code.textContent || ''

        try {
          await navigator.clipboard.writeText(text)

          // Show success feedback
          button.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `
          button.classList.add('copied')

          // Reset after 2 seconds
          setTimeout(() => {
            button.innerHTML = `
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-width="2"/>
              </svg>
            `
            button.classList.remove('copied')
          }, 2000)
        } catch (err) {
          console.error('Failed to copy code:', err)
        }
      }

        // Make the pre block relative positioned
        ;(block as HTMLElement).style.position = 'relative'

        // Add button to code block
        block.appendChild(button)
      })
    }

    // Initial run
    addCopyButtons()

    // Set up a MutationObserver to detect when new content is added
    const observer = new MutationObserver(() => {
      addCopyButtons()
    })

    // Observe changes to the document body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Cleanup observer on unmount
    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}

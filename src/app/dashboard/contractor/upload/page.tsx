"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  ArrowLeft,
  Upload,
  Camera,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
  Plus
} from "lucide-react"

interface UploadedFile {
  id: string
  file: File
  category: string
  preview: string
  status: "pending" | "uploading" | "success" | "error"
}

export default function PhotoUpload() {
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedCategory, setSelectedCategory] = useState("PHOTO_BEFORE")
  const [workOrderId, setWorkOrderId] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = [
    { value: "PHOTO_BEFORE", label: "Before Photos", icon: Camera },
    { value: "PHOTO_DURING", label: "During Photos", icon: Camera },
    { value: "PHOTO_AFTER", label: "After Photos", icon: Camera },
    { value: "DOCUMENT_PDF", label: "PDF Documents", icon: FileText },
    { value: "DOCUMENT_PCR", label: "PCR Forms", icon: FileText },
    { value: "OTHER", label: "Other Files", icon: FileText },
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    files.forEach(file => {
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        category: selectedCategory,
        preview,
        status: "pending"
      }
      
      setUploadedFiles(prev => [...prev, newFile])
    })
  }

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const updateFileCategory = (id: string, category: string) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === id ? { ...file, category } : file
      )
    )
  }

  const handleUpload = async () => {
    if (uploadedFiles.length === 0 || !workOrderId) return

    setIsUploading(true)
    
    for (const uploadedFile of uploadedFiles) {
      try {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === uploadedFile.id ? { ...f, status: "uploading" } : f
          )
        )

        const formData = new FormData()
        formData.append('file', uploadedFile.file)
        formData.append('category', uploadedFile.category)
        formData.append('workOrderId', workOrderId)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === uploadedFile.id ? { ...f, status: "success" } : f
            )
          )
        } else {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === uploadedFile.id ? { ...f, status: "error" } : f
            )
          )
        }
      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === uploadedFile.id ? { ...f, status: "error" } : f
          )
        )
      }
    }

    setIsUploading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "uploading":
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      default:
        return null
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category)
    return cat ? <cat.icon className="h-4 w-4" /> : <FileText className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/contractor"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Upload Photos & Documents
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Upload before, during, and after photos along with required documents
            </p>
          </div>
        </div>
      </div>

      {/* Work Order Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Work Order</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="workOrderId" className="block text-sm font-medium text-gray-700 mb-2">
              Work Order ID
            </label>
            <input
              type="text"
              id="workOrderId"
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter work order ID"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Select Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">File Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                selectedCategory === category.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <category.icon className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">{category.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* File Upload Area */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h3>
        
        {uploadedFiles.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No files selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Click "Select Files" to choose photos and documents to upload
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <select
                    value={file.category}
                    onChange={(e) => updateFileCategory(file.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  
                  {getStatusIcon(file.status)}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {uploadedFiles.length} file(s) selected
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setUploadedFiles([])}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Clear All
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || uploadedFiles.length === 0 || !workOrderId}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? "Uploading..." : "Upload Files"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Guidelines */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Upload Guidelines</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Photos should be clear and well-lit</li>
          <li>• Include before, during, and after photos when applicable</li>
          <li>• PDF documents should be legible and complete</li>
          <li>• Maximum file size: 10MB per file</li>
          <li>• Supported formats: JPG, PNG, PDF, DOC, DOCX</li>
        </ul>
      </div>
    </div>
  )
}

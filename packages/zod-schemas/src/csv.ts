import { zfd } from 'zod-form-data'

export const csvFileSchema = zfd.formData({
  file: zfd.file().refine((file) => ['text/csv'].includes(file.type), {
    message: 'Invalid document file type',
  }),
})

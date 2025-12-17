import { zfd } from 'zod-form-data'

export const excelFileSchema = zfd.formData({
  file: zfd
    .file()
    .refine(
      (file) =>
        [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ].includes(file.type),
      {
        message: 'Invalid document file type',
      },
    ),
})

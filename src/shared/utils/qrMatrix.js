import QRCode from 'qrcode-terminal/vendor/QRCode/index.js'
import QRErrorCorrectLevel from 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel.js'

/** 将支付链接编码为可跨 H5、App 和小程序渲染的二维码矩阵。 */
export function createQrMatrix(value) {
  if (!value) return []

  const qrCode = new QRCode(-1, QRErrorCorrectLevel.M)
  qrCode.addData(String(value))
  qrCode.make()

  const size = qrCode.getModuleCount()
  return Array.from({ length: size }, (_, row) => (
    Array.from({ length: size }, (_, column) => qrCode.isDark(row, column))
  ))
}

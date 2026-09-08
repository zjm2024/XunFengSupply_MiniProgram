/**
 * 表单校验工具 - 资质材料表单校验、手机号校验
 * 对应业务流程节点：
 * 1. 签约准入 → 提交门店资质材料表单校验
 * 2. 登录认证 → 手机号验证码校验
 */

// ==================== 手机号校验 ====================

/**
 * 校验手机号格式
 * @param {string} phone - 手机号码
 * @returns {boolean} 是否合法
 */
export function isPhoneValid(phone) {
  const reg = /^1[3-9]\d{9}$/
  return reg.test(phone)
}

/**
 * 校验手机号并返回错误信息
 * @param {string} phone
 * @returns {string|null} 错误信息，null表示通过
 */
export function validatePhone(phone) {
  if (!phone) return '请输入手机号码'
  if (!isPhoneValid(phone)) return '请输入正确的11位手机号码'
  return null
}

// ==================== 验证码校验 ====================

/**
 * 校验验证码格式
 * @param {string} code - 验证码
 * @returns {boolean}
 */
export function isCodeValid(code) {
  const reg = /^\d{4,6}$/
  return reg.test(code)
}

/**
 * 校验验证码并返回错误信息
 * @param {string} code
 * @returns {string|null}
 */
export function validateCode(code) {
  if (!code) return '请输入验证码'
  if (!isCodeValid(code)) return '验证码格式不正确'
  return null
}

// ==================== 资质材料表单校验 ====================

/**
 * 校验签约资质表单
 * @param {Object} formData - 表单数据
 * @returns {Object} { valid, errors, firstError }
 */
export function validateSignForm(formData) {
  const errors = {}

  // 企业信息
  if (!formData.companyName || !formData.companyName.trim()) {
    errors.companyName = '请输入公司名称'
  } else if (formData.companyName.trim().length > 120) {
    errors.companyName = '公司名称不能超过120个字符'
  }

  if (!formData.contactName || !formData.contactName.trim()) {
    errors.contactName = '请输入联系人姓名'
  } else if (formData.contactName.trim().length > 50) {
    errors.contactName = '联系人姓名不能超过50个字符'
  }

  const phoneError = validatePhone(formData.mobile)
  if (phoneError) {
    errors.mobile = phoneError
  }

  if (!formData.landlinePhone || !formData.landlinePhone.trim()) {
    errors.landlinePhone = '请输入固定电话'
  } else if (!/^[0-9+()\-\s]{5,20}$/.test(formData.landlinePhone.trim())) {
    errors.landlinePhone = '请输入正确的固定电话'
  }

  if (formData.taxNo && formData.taxNo.trim().length > 32) {
    errors.taxNo = '税号不能超过32个字符'
  }

  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = '请输入正确的邮箱地址'
  }

  if (!formData.provinceCode || !formData.cityCode || !formData.districtCode ||
      !formData.province || !formData.city || !formData.district) {
    errors.region = '请选择完整的省、市、区/县'
  }

  if (!formData.addressDetail || !formData.addressDetail.trim()) {
    errors.addressDetail = '请输入详细地址'
  } else if (formData.addressDetail.trim().length > 200) {
    errors.addressDetail = '详细地址不能超过200个字符'
  }

  if (formData.registeredAddress && formData.registeredAddress.trim().length > 200) {
    errors.registeredAddress = '工商注册地址不能超过200个字符'
  }

  if (!formData.licenseUrl) {
    errors.licenseUrl = '请上传营业执照照片'
  }

  if (!formData.agreed) {
    errors.agreed = '请阅读并同意经销商签约协议'
  }

  const valid = Object.keys(errors).length === 0
  const firstError = valid ? null : errors[Object.keys(errors)[0]]

  return { valid, errors, firstError }
}

// ==================== 通用校验 ====================

/**
 * 必填项校验
 * @param {*} value - 值
 * @param {string} fieldName - 字段名称
 * @returns {string|null}
 */
export function required(value, fieldName) {
  if (value === null || value === undefined || value === '' || 
      (Array.isArray(value) && value.length === 0)) {
    return `请输入${fieldName}`
  }
  if (typeof value === 'string' && !value.trim()) {
    return `请输入${fieldName}`
  }
  return null
}

/**
 * 长度范围校验
 * @param {string} value - 值
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @param {string} fieldName - 字段名称
 * @returns {string|null}
 */
export function lengthRange(value, min, max, fieldName) {
  if (!value) return null
  if (value.length < min) {
    return `${fieldName}不能少于${min}个字符`
  }
  if (value.length > max) {
    return `${fieldName}不能超过${max}个字符`
  }
  return null
}

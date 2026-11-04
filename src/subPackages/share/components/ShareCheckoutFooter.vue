<template><view class="checkout-footer"><view class="footer-summary"><text class="footer-count">共 {{ quantity }} 件商品</text><view class="footer-price"><text class="footer-label">{{state.preview?'应付':'商品金额'}}</text><AmountText class="footer-amount" :text="amount" /></view></view><button class="submit-btn button-center" :disabled="state.busy" @click="emit('pay')">{{state.busy?(state.locked?'正在提交…':'正在更新金额…'):state.locked?'重试原提交':'立即支付'}}</button></view></template>
<script setup>
import {computed} from 'vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import {shareGroupAmount} from '../model/shareOrderPresentation.js'
const props=defineProps({state:{type:Object,required:true},items:{type:Array,default:()=>[]}})
const emit=defineEmits(['pay'])
const lines=computed(()=>props.state.preview?.items||props.items)
const quantity=computed(()=>lines.value.reduce((sum,row)=>sum+row.quantity,0))
const amount=computed(()=>{const value=props.state.preview?.payableAmount||shareGroupAmount({items:lines.value});return value?'¥'+value:'—'})
</script><style scoped lang="scss">@import '../../commerce/pages/checkout/presentation.scss';</style>

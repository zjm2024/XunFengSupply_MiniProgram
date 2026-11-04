<template><view class="footer-inner"><label class="select-all" @tap="selectAll"><view class="check" :class="{checked:allSelected}"><text v-if="allSelected">✓</text></view><text>全选</text></label><view class="footer-total"><text class="footer-label">已选 {{ quantity }} 件</text><AmountText class="footer-amount" :text="amount==null?'待核价':'¥'+amount" /></view><button class="checkout-btn button-center" :disabled="busy || !quantity || amount==null" @click="emit('checkout')">去结算</button></view></template>
<script setup>
import {computed} from 'vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import {selectionAmount} from '../model/shareOrderPresentation.js'
const props=defineProps({rows:{type:Array,default:()=>[]},busy:Boolean})
const emit=defineEmits(['edit','checkout'])
const quantity=computed(()=>props.rows.filter(row=>row.selected).reduce((sum,row)=>sum+row.quantity,0))
const amount=computed(()=>selectionAmount(props.rows))
const allSelected=computed(()=>props.rows.some(row=>row.quote)&&props.rows.filter(row=>row.quote).every(row=>row.selected))
/** 与经销商底栏相同，全选不影响SPU伸缩，仅写本地选择。 */
function selectAll(){if(props.busy)return;const selected=!allSelected.value;for(const row of props.rows.filter(row=>row.quote))emit('edit',row.skuId,row.quantity,selected)}
</script><style scoped lang="scss">@import '../../commerce/pages/cart/presentation.scss';</style>
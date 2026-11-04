<template><ShareOverlayPortal :visible="visible"><ProductFilterDrawer title="筛选商品" hint="按商品分类和图片快速找货" :visible="visible" :category-tree="tree" :category-path="selectedPath" :show-stock="false" :show-sort="false" @close="emit('close')" @reset="draftImage=false" @apply="apply"><template #extra><view class="image-filter"><text class="image-filter-title">商品图片</text><view class="image-filter-options"><button :class="{active:!draftImage}" @click="draftImage=false">全部商品</button><button :class="{active:draftImage}" @click="draftImage=true">仅看有图</button></view></view></template></ProductFilterDrawer></ShareOverlayPortal></template>
<script setup>
import {computed,ref,watch} from 'vue'
import {categoryTree} from '@/shared/model/categoryTree.js'
import ProductFilterDrawer from '@/subPackages/commerce/components/ProductFilterDrawer/ProductFilterDrawer.vue'
import ShareOverlayPortal from './ShareOverlayPortal.vue'
const props=defineProps({visible:Boolean,categories:{type:Array,default:()=>[]},categoryId:{type:[String,Number],default:null},hasImage:Boolean})
const emit=defineEmits(['close','apply'])
const draftImage=ref(false)
const tree=computed(()=>categoryTree(props.categories))
/** 从真实树恢复所选分类面包屑，保留长整型字符串。 */
function findPath(nodes,id){for(const node of nodes){if(String(node.id)===String(id))return [node];const children=findPath(node.children||[],id);if(children.length)return [node,...children]}return []}
const selectedPath=computed(()=>findPath(tree.value,props.categoryId))
watch(()=>props.visible,value=>{if(value)draftImage.value=props.hasImage})
/** 只提交服务端支持的分类与有图条件，不做单页伪筛选。 */
function apply(value){emit('apply',{categoryId:value.categoryPath.at(-1)?.id||null,hasImage:draftImage.value});emit('close')}
</script><style scoped>.image-filter{margin:12px;padding:16px;background:#f6f7f9;border-radius:16px}.image-filter-title{font-size: var(--type-card-title-size, 16px);font-weight: var(--font-weight-semibold, 600)}.image-filter-options{display:flex;gap:10px;margin-top:12px}.image-filter-options button{flex:1;margin:0;background:#fff;border:1px solid #e3e4e8;border-radius: var(--radius-control, 10px);font-size: var(--type-body-small-size, 13px);line-height: 42px}.image-filter-options button:after{border:0}.image-filter-options button.active{color:#d7192d;border-color:#d7192d;background:#fff6f7}</style>

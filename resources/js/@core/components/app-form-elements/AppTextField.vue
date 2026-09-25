<script setup>
defineOptions({
  name: 'AppTextField',
  inheritAttrs: false,
})

const attrs = useAttrs()
const rawId = useId()

const elementId = computed(() => {
  const _elementIdToken = attrs.id
  
  return _elementIdToken ? `app-text-field-${ _elementIdToken }` : rawId
})

const label = computed(() => attrs.label)
</script>

<template>
  <div
    class="app-text-field flex-grow-1"
    :class="$attrs.class"
  >
    <VLabel
      v-if="label"
      :for="elementId"
      class="mb-1 text-body-2 text-wrap"
      style="line-height: 15px;"
      :text="label"
    />
    <VTextField
      v-bind="{
        ...$attrs,
        class: null,
        label: undefined,
        variant: 'outlined',
        id: elementId,
      }"
    >
      <template
        v-for="(_, name) in $slots"
        #[name]="slotProps"
      >
        <slot
          :name="name"
          v-bind="slotProps || {}"
        />
      </template>
    </VTextField>
  </div>
</template>

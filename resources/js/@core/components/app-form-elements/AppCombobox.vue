<script setup>
defineOptions({
  name: 'AppCombobox',
  inheritAttrs: false,
})

const attrs = useAttrs()
const rawId = useId()

const elementId = computed(() => {
  const _elementIdToken = attrs.id
  
  return _elementIdToken ? `app-combobox-${ _elementIdToken }` : rawId
})

const label = computed(() => attrs.label)
</script>

<template>
  <div
    class="app-combobox flex-grow-1"
    :class="$attrs.class"
  >
    <VLabel
      v-if="label"
      :for="elementId"
      class="mb-1 text-body-2"
      :text="label"
    />

    <VCombobox
      v-bind="{
        ...$attrs,
        class: null,
        label: undefined,
        variant: 'outlined',
        id: elementId,
        menuProps: {
          contentClass: [
            'app-inner-list',
            'app-combobox__content',
            'v-combobox__content',
            $attrs.multiple !== undefined ? 'v-list-select-multiple' : '',
          ],
        },
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
    </VCombobox>
  </div>
</template>

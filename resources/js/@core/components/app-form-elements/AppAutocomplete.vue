<script setup>
defineOptions({
  name: 'AppAutocomplete',
  inheritAttrs: false,
})

const attrs = useAttrs()
const rawId = useId()

const elementId = computed(() => {
  const _elementIdToken = attrs.id
  
  return _elementIdToken ? `app-autocomplete-${ _elementIdToken }` : rawId
})

const label = computed(() => attrs.label)
</script>

<template>
  <div
    class="app-autocomplete flex-grow-1"
    :class="$attrs.class"
  >
    <VLabel
      v-if="label"
      :for="elementId"
      class="mb-1 text-body-2"
      :text="label"
    />
    <VAutocomplete
      v-bind="{
        ...$attrs,
        class: null,
        label: undefined,
        id: elementId,
        variant: 'outlined',
        menuProps: {
          contentClass: [
            'app-inner-list',
            'app-autocomplete__content',
            'v-autocomplete__content',
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
    </VAutocomplete>
  </div>
</template>

<script setup lang="ts">
interface MonthlyStatData {
  readonly month: string
  readonly episodes: number
  readonly movies: number
}

const props = defineProps<{ data: readonly MonthlyStatData[] }>()
const { t } = useI18n()

// Validated pair for dark-surface dataviz: luminance band, CVD, and contrast.
const EPISODE_COLOR = '#d97706'
const MOVIE_COLOR = '#0284c7'

const BAR_WIDTH = 18
const BAR_GAP = 10
const CHART_HEIGHT = 140
const LABEL_HEIGHT = 18
const SEGMENT_GAP = 2
const TOP_RADIUS = 2

const chartWidth = computed(() => props.data.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP)
const maxTotal = computed(() =>
  Math.max(1, ...props.data.map(item => item.episodes + item.movies)),
)
const hasData = computed(() => props.data.some(item => item.episodes + item.movies > 0))

function scaled(value: number): number {
  return (value / maxTotal.value) * (CHART_HEIGHT - TOP_RADIUS * 2)
}

interface BarShape {
  readonly x: number
  readonly month: string
  readonly label: string
  readonly episodes: number
  readonly movies: number
  readonly episodeY: number
  readonly episodeHeight: number
  readonly movieY: number
  readonly movieHeight: number
}

const bars = computed<readonly BarShape[]>(() =>
  props.data.map((item, index) => {
    const episodeHeight = scaled(item.episodes)
    const movieHeight = scaled(item.movies)
    const episodeY = CHART_HEIGHT - episodeHeight
    const movieY = episodeY - (movieHeight > 0 ? movieHeight + SEGMENT_GAP : 0)
    return {
      x: index * (BAR_WIDTH + BAR_GAP),
      month: item.month,
      label: shortMonthLabel(item.month),
      episodes: item.episodes,
      movies: item.movies,
      episodeY,
      episodeHeight,
      movieY,
      movieHeight,
    }
  }),
)
</script>

<template>
  <UCard>
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-medium">{{ t('stats.monthlyTitle') }}</h3>
      <div class="flex items-center gap-3 text-xs text-muted">
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full" :style="{ backgroundColor: EPISODE_COLOR }" />
          {{ t('common.episodes') }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full" :style="{ backgroundColor: MOVIE_COLOR }" />
          {{ t('common.movies') }}
        </span>
      </div>
    </div>

    <p v-if="!hasData" class="py-8 text-center text-sm text-muted">
      {{ t('stats.monthlyEmpty') }}
    </p>

    <svg
      v-else
      :viewBox="`0 0 ${chartWidth} ${CHART_HEIGHT + LABEL_HEIGHT}`"
      class="w-full"
      role="img"
      :aria-label="t('stats.monthlyAria')"
    >
      <line
        :x1="0"
        :y1="CHART_HEIGHT + 0.5"
        :x2="chartWidth"
        :y2="CHART_HEIGHT + 0.5"
        stroke="currentColor"
        class="text-default"
        stroke-opacity="0.25"
      />
      <g v-for="bar in bars" :key="bar.month">
        <title>
          {{ t('stats.monthlyTooltip', { month: bar.label, episodes: bar.episodes, movies: bar.movies }) }}
        </title>
        <rect
          v-if="bar.episodeHeight > 0"
          :x="bar.x"
          :y="bar.episodeY"
          :width="BAR_WIDTH"
          :height="bar.episodeHeight"
          :rx="bar.movieHeight > 0 ? 0 : TOP_RADIUS"
          :fill="EPISODE_COLOR"
        />
        <rect
          v-if="bar.movieHeight > 0"
          :x="bar.x"
          :y="bar.movieY"
          :width="BAR_WIDTH"
          :height="bar.movieHeight"
          :rx="TOP_RADIUS"
          :fill="MOVIE_COLOR"
        />
        <text
          v-if="bars.indexOf(bar) % 2 === 0"
          :x="bar.x + BAR_WIDTH / 2"
          :y="CHART_HEIGHT + LABEL_HEIGHT - 4"
          text-anchor="middle"
          class="fill-current text-muted"
          font-size="9"
        >
          {{ bar.label }}
        </text>
      </g>
    </svg>
  </UCard>
</template>

import type { ProjectEntry } from "./types";

type ProjectCuratedMedia = Pick<ProjectEntry, "thumbnail" | "media">;

/** Checked-in captures that are edited directly and must not be overwritten by the media generator. */
export const curatedProjectMedia = {
  "y2k-warsaw": {
    "thumbnail": {
      "desktop": {
        "poster": "/projects/y2k-warsaw/thumbnail-v2.png",
        "video": "/projects/y2k-warsaw/thumbnail-v2.mp4",
        "width": 1956,
        "height": 1048
      }
    },
    "media": [
      {
        "kind": "video",
        "alt": "Y2K WARSAW desktop scroll from the homepage through new arrivals, a product, and the cart",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-01-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-01-poster-v2.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Y2K WARSAW desktop header collapsing on scroll, then opening again",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-02-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-02-poster-v2.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Y2K WARSAW desktop brands menu opening and closing",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-03-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-03-poster-v2.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Y2K WARSAW desktop add to cart and cart drawer",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-05-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-05-poster-v2.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Y2K WARSAW mobile scroll from the homepage through new arrivals, a product, and the cart",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-06-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-06-poster-v2.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "video",
        "alt": "Y2K WARSAW mobile menu opening and closing",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-07-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-07-poster-v2.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "video",
        "alt": "Y2K WARSAW mobile brands list expanding in the menu",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-08-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-08-poster-v2.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "video",
        "alt": "Y2K WARSAW mobile filter drawer opening and closing",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-10-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-10-poster-v2.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "video",
        "alt": "Y2K WARSAW mobile add to cart and cart drawer",
        "loop": true,
        "desktop": {
          "src": "/projects/y2k-warsaw/media-11-v2.mp4",
          "poster": "/projects/y2k-warsaw/media-11-poster-v2.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "image",
        "alt": "Y2K WARSAW product page",
        "desktop": {
          "src": "/projects/y2k-warsaw/media-04.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "image",
        "alt": "Y2K WARSAW mobile product page",
        "desktop": {
          "src": "/projects/y2k-warsaw/media-09.png",
          "width": 780,
          "height": 1680
        }
      }
    ]
  },
  "lumano": {
    "thumbnail": {
      "desktop": {
        "poster": "/projects/lumano/thumbnail.png",
        "video": "/projects/lumano/thumbnail.mp4",
        "width": 1956,
        "height": 1048
      }
    },
    "media": [
      {
        "kind": "video",
        "alt": "Lumano live landing with animated typography and jewelry",
        "loop": true,
        "desktop": {
          "src": "/projects/lumano/media-01.mp4",
          "poster": "/projects/lumano/media-01-poster.png",
          "width": 1920,
          "height": 1080
        }
      },
      {
        "kind": "video",
        "alt": "Lumano live storefront landing scroll",
        "loop": true,
        "desktop": {
          "src": "/projects/lumano/media-02.mp4",
          "poster": "/projects/lumano/media-02-poster.png",
          "width": 1920,
          "height": 1080
        }
      },
      {
        "kind": "image",
        "alt": "Lumano storefront homepage",
        "desktop": {
          "src": "/projects/lumano/media-03.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "image",
        "alt": "Lumano configurable product collection",
        "desktop": {
          "src": "/projects/lumano/media-04.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "image",
        "alt": "Lumano customized product page",
        "desktop": {
          "src": "/projects/lumano/media-05.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "image",
        "alt": "Lumano brand story page",
        "desktop": {
          "src": "/projects/lumano/media-06.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "image",
        "alt": "Lumano responsive mobile storefront",
        "desktop": {
          "src": "/projects/lumano/media-07.png",
          "width": 780,
          "height": 1680
        }
      }
    ]
  },
  "mon-nom-bakery": {
    "thumbnail": {
      "desktop": {
        "poster": "/projects/mon-nom-bakery/thumbnail-video-poster.png",
        "video": "/projects/mon-nom-bakery/thumbnail.mp4",
        "width": 1956,
        "height": 1048
      }
    },
    "media": [
      {
        "kind": "image",
        "alt": "Mon Nom Bakery localized mobile landing",
        "desktop": {
          "src": "/projects/mon-nom-bakery/media-01.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "image",
        "alt": "Mon Nom Bakery Sanity-managed mobile menu",
        "desktop": {
          "src": "/projects/mon-nom-bakery/media-03.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "video",
        "alt": "Mon Nom Bakery smooth menu scroll with animated images and active item highlights",
        "loop": true,
        "desktop": {
          "src": "/projects/mon-nom-bakery/media-04.mp4",
          "poster": "/projects/mon-nom-bakery/media-04-poster.png",
          "width": 2400,
          "height": 1194
        }
      },
      {
        "kind": "video",
        "alt": "Mon Nom Bakery real contextual preview click and full-screen image viewer",
        "loop": true,
        "desktop": {
          "src": "/projects/mon-nom-bakery/media-05.mp4",
          "poster": "/projects/mon-nom-bakery/media-05-poster.png",
          "width": 2400,
          "height": 1194
        }
      }
    ]
  },
  "lina-tsapova": {
    "thumbnail": {
      "desktop": {
        "poster": "/projects/lina-tsapova/thumbnail.png",
        "video": "/projects/lina-tsapova/thumbnail.mp4",
        "width": 1956,
        "height": 1048
      }
    },
    "media": [
      {
        "kind": "image",
        "alt": "Lina Tsapova modeling portfolio",
        "desktop": {
          "src": "/projects/lina-tsapova/media-01.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "image",
        "alt": "Lina Tsapova photography portfolio",
        "desktop": {
          "src": "/projects/lina-tsapova/media-02.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "image",
        "alt": "Lina Tsapova about and contact page",
        "desktop": {
          "src": "/projects/lina-tsapova/media-03.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Lina Tsapova desktop view transitions",
        "loop": true,
        "desktop": {
          "src": "/projects/lina-tsapova/media-04.mp4",
          "poster": "/projects/lina-tsapova/media-04-poster.png",
          "width": 2404,
          "height": 1192
        }
      },
      {
        "kind": "video",
        "alt": "Lina Tsapova mobile portfolio transition",
        "loop": true,
        "desktop": {
          "src": "/projects/lina-tsapova/media-05.mp4",
          "poster": "/projects/lina-tsapova/media-05-poster.png",
          "width": 432,
          "height": 934
        }
      },
      {
        "kind": "video",
        "alt": "Lina Tsapova mobile gallery lightbox",
        "loop": true,
        "desktop": {
          "src": "/projects/lina-tsapova/media-06.mp4",
          "poster": "/projects/lina-tsapova/media-06-poster.png",
          "width": 432,
          "height": 934
        }
      }
    ]
  },
  "pastel-muse": {
    "thumbnail": {
      "desktop": {
        "poster": "/projects/pastel-muse/thumbnail.png",
        "video": "/projects/pastel-muse/thumbnail.mp4",
        "width": 1955,
        "height": 1047
      }
    },
    "media": [
      {
        "kind": "image",
        "alt": "Pastel Muse landing",
        "desktop": {
          "src": "/projects/pastel-muse/media-05.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Pastel Muse desktop landing, style grid, and results",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-04.mp4",
          "poster": "/projects/pastel-muse/media-04-poster.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Pastel Muse mobile intro",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-01.mp4",
          "poster": "/projects/pastel-muse/media-01-poster.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "video",
        "alt": "Pastel Muse mobile landing and results",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-02.mp4",
          "poster": "/projects/pastel-muse/media-02-poster.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "image",
        "alt": "Pastel Muse registration experience",
        "desktop": {
          "src": "/projects/pastel-muse/media-07.png",
          "width": 1955,
          "height": 1047
        }
      },
      {
        "kind": "image",
        "alt": "Blooming Diva photo-day experience",
        "desktop": {
          "src": "/projects/pastel-muse/media-10.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Blooming Diva desktop grid switcher and image zoom",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-08.mp4",
          "poster": "/projects/pastel-muse/media-08-poster.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Blooming Diva mobile grid switcher",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-03.mp4",
          "poster": "/projects/pastel-muse/media-03-poster.png",
          "width": 780,
          "height": 1680
        }
      },
      {
        "kind": "video",
        "alt": "Wild Grace desktop grid switcher and image zoom",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-09.mp4",
          "poster": "/projects/pastel-muse/media-09-poster.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "video",
        "alt": "Wild Grace mobile grid switcher and image zoom",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-13.mp4",
          "poster": "/projects/pastel-muse/media-13-poster.png",
          "width": 780,
          "height": 1680
        }
      }
    ]
  },
  "full-course-studio": {
    thumbnail: {
      desktop: {
        poster: "/projects/full-course-studio/thumbnail.png",
        video: "/projects/full-course-studio/thumbnail.mp4",
        width: 1956,
        height: 1048,
      },
    },
    media: [
      {
        kind: "video",
        alt: "Preloader, then the hero figure morphing through pastry forms",
        loop: true,
        desktop: {
          src: "/projects/full-course-studio/media-01.mp4",
          poster: "/projects/full-course-studio/media-01-poster.png",
          width: 1956,
          height: 1048,
        },
      },
      {
        kind: "video",
        alt: "Hover on navigation, the call button, and the work links",
        loop: true,
        desktop: {
          src: "/projects/full-course-studio/media-02.mp4",
          poster: "/projects/full-course-studio/media-02-poster.png",
          width: 1956,
          height: 1048,
        },
      },
      {
        kind: "video",
        alt: "Mark settings for colour, detail, size, and the next pastry form",
        loop: true,
        desktop: {
          src: "/projects/full-course-studio/media-03.mp4",
          poster: "/projects/full-course-studio/media-03-poster.png",
          width: 1956,
          height: 1048,
        },
      },
      {
        kind: "video",
        alt: "Dark mode, with the atmosphere gradient shifting to the night palette",
        loop: true,
        desktop: {
          src: "/projects/full-course-studio/media-04.mp4",
          poster: "/projects/full-course-studio/media-04-poster.png",
          width: 1956,
          height: 1048,
        },
      },
      {
        kind: "video",
        alt: "Language switch from English to Polish, then Russian",
        loop: true,
        desktop: {
          src: "/projects/full-course-studio/media-05.mp4",
          poster: "/projects/full-course-studio/media-05-poster.png",
          width: 1956,
          height: 1048,
        },
      },
      {
        kind: "video",
        alt: "Service scenes: a search ad, a social post, and a café menu on a phone",
        loop: true,
        desktop: {
          src: "/projects/full-course-studio/media-06.mp4",
          poster: "/projects/full-course-studio/media-06-poster.png",
          width: 1956,
          height: 1048,
        },
      },
      {
        kind: "video",
        alt: "Footer wordmark: glyphs scatter under the pointer, then the press changes the pose",
        loop: true,
        desktop: {
          src: "/projects/full-course-studio/media-07.mp4",
          poster: "/projects/full-course-studio/media-07-poster.png",
          width: 1956,
          height: 1048,
        },
      },
      {
        kind: "video",
        alt: "Mobile preloader, mark settings, the ads phone scene, and a footer wordmark tap",
        loop: true,
        desktop: {
          src: "/projects/full-course-studio/media-08.mp4",
          poster: "/projects/full-course-studio/media-08-poster.png",
          width: 780,
          height: 1680,
        },
      },
    ],
  },
} satisfies Record<string, ProjectCuratedMedia>;

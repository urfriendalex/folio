import type { ProjectEntry } from "./types";

type ProjectCuratedMedia = Pick<ProjectEntry, "thumbnail" | "media">;

/** Checked-in captures that are edited directly and must not be overwritten by the media generator. */
export const curatedProjectMedia = {
  "lumano": {
    "thumbnail": {
      "desktop": {
        "poster": "/projects/lumano/thumbnail.png",
        "video": "/projects/lumano/thumbnail.mp4",
        "width": 1920,
        "height": 1080
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
        "width": 2400,
        "height": 1190
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
        "width": 2404,
        "height": 1192
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
        "alt": "Pastel Muse mobile scroll",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-02.mp4",
          "poster": "/projects/pastel-muse/media-02-poster.png",
          "width": 780,
          "height": 1678
        }
      },
      {
        "kind": "video",
        "alt": "Pastel Muse mobile tabs",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-03.mp4",
          "poster": "/projects/pastel-muse/media-03-poster.png",
          "width": 780,
          "height": 1682
        }
      },
      {
        "kind": "video",
        "alt": "Pastel Muse desktop scroll",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-04.mp4",
          "poster": "/projects/pastel-muse/media-04-poster.png",
          "width": 1956,
          "height": 1048
        }
      },
      {
        "kind": "image",
        "alt": "Pastel Muse photo-day landing",
        "desktop": {
          "src": "/projects/pastel-muse/media-05.png",
          "width": 1955,
          "height": 1047
        }
      },
      {
        "kind": "image",
        "alt": "Pastel Muse event details",
        "desktop": {
          "src": "/projects/pastel-muse/media-06.png",
          "width": 1955,
          "height": 1047
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
        "kind": "video",
        "alt": "Pastel Muse desktop tabs",
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
        "alt": "Pastel Muse user flow",
        "loop": true,
        "desktop": {
          "src": "/projects/pastel-muse/media-09.mp4",
          "poster": "/projects/pastel-muse/media-09-poster.png",
          "width": 1956,
          "height": 1048
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
        "kind": "image",
        "alt": "Wild Grace summer photo-day experience",
        "desktop": {
          "src": "/projects/pastel-muse/media-11.png",
          "width": 1956,
          "height": 1048
        }
      }
    ]
  },
} satisfies Record<string, ProjectCuratedMedia>;

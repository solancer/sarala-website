# Queueing Math for Capacity Planning

Why latency explodes long before a system hits 100% utilisation.

## Little's law

For any stable system, the average number of requests in flight equals the arrival rate times the average time each one spends inside:

$$
L = \lambda W
$$

## The M/M/1 queue

With arrival rate $\lambda$ and service rate $\mu$, utilisation is $\rho = \lambda / \mu$, and the mean response time is

$$
W = \frac{1}{\mu - \lambda} = \frac{1}{\mu}\cdot\frac{1}{1 - \rho}
$$

So at $\rho = 0.5$ a request takes twice its service time, and at $\rho = 0.9$ it takes **ten times** as long.

| Utilisation $\rho$ | Slowdown $\frac{1}{1-\rho}$ |
| --: | --: |
| 50% | 2× |
| 80% | 5× |
| 90% | 10× |
| 95% | 20× |

## Tail latency

For an exponential response-time distribution, the $p$-th percentile is

$$
W_p = -\,W \ln(1 - p), \qquad W_{0.99} \approx 4.6\,W
$$

> [!NOTE]
> Plan for the 99th percentile, not the mean: keep busy servers below about 70% utilisation.
